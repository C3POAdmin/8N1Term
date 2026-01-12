use std::collections::HashMap;
use std::sync::Mutex;
use serde::Serialize;
use std::process::Command;
use std::io::ErrorKind;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use tauri::{Manager, AppHandle, Emitter};
use tauri_plugin_dialog::DialogExt;

struct PortHandle {
    port: Box<dyn serialport::SerialPort>,
    alive: Arc<AtomicBool>,
}

pub struct SerialState {
	ports: std::sync::Mutex<std::collections::HashMap<String, PortHandle>>,
}

#[derive(Serialize,Clone)]
struct PortInfo {
  path: String,
  port_type: String,
  manufacturer: Option<String>,
  product: Option<String>,
  serial_number: Option<String>,
}

#[tauri::command]
fn list_ports() -> Result<Vec<PortInfo>, String> {
    println!("[command] list_ports");
    collect_ports()
}

fn collect_ports() -> Result<Vec<PortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;

    Ok(ports.into_iter().map(|p| {
        let port_type_str = format!("{:?}", p.port_type);

        let (manufacturer, product, serial_number) = match p.port_type {
            serialport::SerialPortType::UsbPort(info) => (
                info.manufacturer,
                info.product,
                info.serial_number,
            ),
            _ => (None, None, None),
        };

        PortInfo {
            path: p.port_name,
            port_type: port_type_str,
            manufacturer,
            product,
            serial_number,
        }
    }).collect())
}

fn start_port_watcher(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        println!("[watcher] thread started");

        use std::{collections::HashSet, time::Duration};

        let mut last: HashSet<String> = HashSet::new();

        loop {
            match collect_ports() {
                Ok(ports) => {
                    let current: HashSet<String> =
                        ports.iter().map(|p| p.path.clone()).collect();

                    if current != last {
                        println!(
                            "[watcher] ports changed: {:?}",
                            current
                        );

                        let _ = app.emit("serial-ports-changed", ports.clone());
                        last = current;
                    }
                }
                Err(e) => {
                    println!("[watcher] collect_ports error: {}", e);
                }
            }

            std::thread::sleep(Duration::from_millis(500));
        }
    });
}

#[tauri::command]
fn open_port(
    app: tauri::AppHandle,
    state: tauri::State<'_, SerialState>,
    path: String,
    baud: u32,
) -> Result<(), String> {

    println!("[command] open_port() called for {}", path);

    // ---- phase 1: check only
    {
        let ports = state.ports.lock().unwrap();
		println!("[open_port] map contains {} = {}", path, ports.contains_key(&path));
        if ports.contains_key(&path) {
			println!("[open_port] EARLY RETURN: already open in map");
            let _ = app.emit("serial_state", format!("closed: {}", path));
            return Err(format!("port already open: {}", path));
        }
    } // mutex released HERE

	println!("[open_port] attempting OS open: {} @ {}", path, baud);
	let port = serialport::new(&path, baud)
		.timeout(std::time::Duration::from_millis(50))
		.open()
		.map_err(|e| {
			println!("[open_port] open failed for {}: {}", path, e);
			let _ = app.emit("serial_state", format!("failed: {}", path));
			format!("open failed") // satisfy type, but you don't care
		})?;

    println!("[open_port] serial port opened");

    // IMPORTANT: don't clone yet while debugging
    let mut reader = port.try_clone().map_err(|e| e.to_string())?;

    let alive = Arc::new(AtomicBool::new(true));
    let alive_reader = alive.clone();

    let app2 = app.clone();
    let app = app.clone();
    let path_clone = path.clone();

    // ---- phase 2: register ownership (MOVED UP before spawn)
    {
        let mut ports = state.ports.lock().unwrap();
        ports.insert(
            path.clone(),
            PortHandle {
                port,
                alive: alive.clone(),
            },
        );
    }

    std::thread::spawn(move || {
        println!("serial reader thread started for {}", path_clone);

        let mut buf = [0u8; 4096];

        while alive_reader.load(Ordering::Relaxed) {
            match reader.read(&mut buf) {
                Ok(n) => {
                    if n > 0 {
						println!("reader in: {} bytes", n);
						let _ = app.emit("serial_rx", buf[..n].to_vec());
                    }
                }

                Err(ref e) if e.kind() == ErrorKind::TimedOut => {
                    // normal idle, do nothing
                }

                Err(e) => {
                    println!("serial read error: {}", e);

                    // stop + DROP the real port handle by removing it from the map
                    alive_reader.store(false, Ordering::Relaxed);

                    {
                        let serial_state = app.state::<SerialState>();
                        let mut ports = serial_state.ports.lock().unwrap();
                        ports.remove(&path_clone); // <-- this is the critical part
                    }

                    let _ = app.emit("serial_state", format!("closed: {}", path_clone));
                    break;
                }
            }
        }
        println!("serial reader thread exiting");
    });

    let _ = app2.emit("serial_state", format!("opened: {}", path));
    println!("spawned serial reader thread");

    Ok(())
}

#[tauri::command]
fn close_port(
		app: tauri::AppHandle,
		state: tauri::State<'_, SerialState>
	) -> Result<(), String> {
    println!("[command] close_port");

    let mut ports = state.ports.lock().unwrap();

    let app = app.clone();
    for (_, handle) in ports.drain() {
        handle.alive.store(false, std::sync::atomic::Ordering::Relaxed);
		println!("Closed port");
		let _ = app.emit("serial_state", format!("closed"));
    }

    Ok(())
}

#[tauri::command]
fn send_bytes(
    state: tauri::State<'_, SerialState>,
    path: String,
    data: Vec<u8>,
) -> Result<(), String> {

  println!("[command] send_bytes {}",data.len());
  let mut ports = state.ports.lock().unwrap();
    let handle = ports.get_mut(&path).ok_or("port not open")?;

    std::io::Write::write_all(&mut *handle.port, &data)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn restart_app(app: AppHandle) -> Result<(), String> {
    println!("[command] restart_app");

    let exe = std::env::current_exe()
        .map_err(|e| e.to_string())?;

    Command::new(exe)
        .spawn()
        .map_err(|e| e.to_string())?;

    app.exit(0);
    Ok(())
}


#[tauri::command]
fn load_bytes(app: tauri::AppHandle) -> Result<Vec<u8>, String> {
    println!("[command] load_bytes");

    let fp = app
        .dialog()
        .file()
        .blocking_pick_file()
        .ok_or("No file selected")?;

    let path = fp.into_path().map_err(|_| "Non-filesystem path/URI")?;
    std::fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_bytes(app: tauri::AppHandle, filename: String, data: Vec<u8>) -> Result<(), String> {
    let app2 = app.clone();
    let data = Arc::new(data);

    // optional: choose a sensible starting folder
    let start_dir = app
        .path()
        .document_dir()
        .or_else(|_| app.path().home_dir())
        .ok();

    let mut dlg = app.dialog().file().set_file_name(filename);
    if let Some(dir) = start_dir {
        dlg = dlg.set_directory(dir);
    }

    dlg.save_file(move |file_path| {
        let Some(fp) = file_path else {
            // user cancelled
            return;
        };

        let Ok(path) = fp.into_path() else {
            // non-filesystem URI (mobile etc)
            let _ = app2.emit("save_bytes_error", "Non-filesystem path/URI");
            return;
        };

        let data = data.clone();
        tauri::async_runtime::spawn(async move {
            let res = std::fs::write(&path, &*data).map_err(|e| e.to_string());
            match res {
                Ok(_) => {
                    let _ = app2.emit("save_bytes_done", path.to_string_lossy().to_string());
                }
                Err(e) => {
                    let _ = app2.emit("save_bytes_error", e);
                }
            }
        });
    });

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(SerialState {
      ports: Mutex::new(HashMap::new()),
    })
    .invoke_handler(tauri::generate_handler![
      list_ports,
      open_port,
      close_port,
      send_bytes,
      restart_app,
      save_bytes,
      load_bytes
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      start_port_watcher(app.handle().clone());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
