import './style.css';
import Split from "split.js";
import Swal from 'sweetalert2';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const 	root 		 = document.getElementById('app');
let		current_port = null;
let		current_baud = null;
let 	lastLatched  = null;
let 	latchTimer 	 = 0;
let     opened		 = false;
let 	bs_enter 	 = false;
let		auto_connect = true;
let		auto_reconnect = true;
let		echo 		 = true;
let		CR 		 	 = true;
let		LF 		 	 = true;
let		scroll		 = true;
let		line_mode 	 = true;
let 	hexEl 		 = null;
let 	textEl 		 = null;
let 	byte_buffer  = [];
let 	last_buffer  = [];
const 	GREEN = "\u{1F7E2}";
const 	RED   = "\u{1F534}";

//=================================== main ==============================/

await closePort();

let unlisten_rx = await listen('serial_rx', (event) => {
	try {
		const bytes = new Uint8Array(event.payload);
		console.log('RX:', bytes);
	} catch (e) {
		console.log('serial_rx',e);
	}
});

const unlisten_usb = await listen('serial-ports-changed', (event) => {
	try {
		console.log('[RS] serial-ports-changed',current_port);
		if(current_port === null) {
			console.log('update port list');
			renderPorts(event.payload);
			return;
		}
	} catch (e) {
		console.log('serial-ports-changed',e);
	}
});

const unlisten_serial = await listen('serial_state', (event) => {
	try {
		const val = event.payload;
		console.log('serial_state',val);
		opened = val.includes('opened');
		updateConnected();
	} catch (e) {
		console.log('serial_state',e);
	}
});

const 	ports 		 = await invoke('list_ports');
root.hidden = true;
await   renderApp();

await pickSerialPort(ports); // sets current_port as internals for refreshed ports mess with the return value
current_baud = await pickBaudRate();
console.log('current_baud',current_baud);
await renderSplit();
await connect(true);
const   connection_el = document.getElementById("connection");
document.getElementById("rx_title").innerHTML = `${current_port}&nbsp;${current_baud} Baud`

root.hidden = false;

await drawAsciiKeyboard('kb_body', (code, label) => {
  console.log('ASCII:', label, code);
});

const tx = installAsciiKeyboardCapture({
  hexDivId: 'tx-hex',
  textDivId: 'tx-text',
  onByte: (b) => console.log('byte', b)
});

const l_rx = document.querySelector("#l_rx");
const r_rx = document.querySelector("#r_rx");
const l_tx = document.querySelector("#l_tx");
const r_tx = document.querySelector("#r_tx");
const l_kb = document.querySelector("#l_kb");
const r_kb = document.querySelector("#r_kb");

//-----------------------------RX-------------------//

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right" class="ft-btn ft-small" id="restart">New</button>'
);
document.getElementById("restart").addEventListener("click", restartApp);

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px" class="ft-btn ft-small" id="save">Save</button>'
);
document.getElementById("save").addEventListener("click", saveBytes);

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;" class="ft-btn ft-small" id="disconnect">Disconnect</button>'
);
const el_disconnect = document.getElementById("disconnect")
el_disconnect.addEventListener("click", closePort);
el_disconnect.hidden = true;

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;" class="ft-btn ft-small" id="connect">Connect</button>'
);
const el_connect = document.getElementById("connect")
el_connect.addEventListener("click", openPort);
el_connect.hidden = true;

const arc = createToggle({
  label: "Reconnect",
  initial: auto_reconnect,
  onChange: (label, state) => {
    console.log(label, state);
	auto_reconnect = state;
  }
});
l_rx.appendChild(arc);

const ech = createToggle({
  label: "Echo",
  initial: echo,
  onChange: (label, state) => {
    console.log(label, state);
	echo = state;
  }
});
l_rx.appendChild(ech);

const lm = createToggle({
  label: "Lines",
  initial: line_mode,
  onChange: (label, state) => {
    console.log(label, state);
	line_mode = state;
  }
});
l_rx.appendChild(lm);

const sc = createToggle({
  label: "Scroll",
  initial: scroll,
  onChange: (label, state) => {
    console.log(label, state);
	scroll = state;
  }
});
l_rx.appendChild(sc);

//-----------------------------TX-------------------//
r_tx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:-3px;margin-top:-2px" class="ft-btn ft-small"  id="re-send">RE-SEND</button>'
);
document.getElementById("re-send").addEventListener("click", reSendBuffer);

r_tx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;margin-top:-2px" class="ft-btn ft-small" id="load">Load</button>'
);
document.getElementById("load").addEventListener("click", loadBytes);

const cr = createToggle({
  label: "CR",
  initial: CR,
  onChange: (label, state) => {
    console.log(label, state);
	echo = state;
  }
});
l_tx.appendChild(cr);

const lf = createToggle({
  label: "LF",
  initial: LF,
  onChange: (label, state) => {
    console.log(label, state);
	echo = state;
  }
});
l_tx.appendChild(lf);

//-------------------------KB ------------------------/

const bse = createToggle({
  label: "BS/Enter",
  initial: bs_enter,
  onChange: (label, state) => {
    console.log(label, state);
	bs_enter = state;
  }
});
l_kb.appendChild(bse);

//=================================== helpers ==============================/

function updateConnected() {
	console.log('updateConnected()');
	try {
		if(opened) { 
			console.log('port open');
			connection_el.innerHTML = GREEN+' Connected'
			el_connect.hidden 	 = true;
			el_disconnect.hidden = false;
		} else {
			console.log('port close');
			connection_el.innerHTML = RED+' Disconnected'
			el_disconnect.hidden = true;
			el_connect.hidden 	 = false;
		}
	} catch(e) {
		console.log(e);
	}
}
async function renderApp() {
root.innerHTML = 
 `<div id="rx_panel" class="panel no-select">
	  <div class="title no-select">
		  <div id="rx_title" style="float:left;width:120px;padding-top:4px"></div>
		  <div style="float:left;padding-top:4px" id="connection"></div>
		  <div style="float:right;margin-right:-3px" id="r_rx"></div>
		  <div style="float:right;margin-right:15px" id="l_rx"></div>
		  <div style="clear:both"></div>
	  </div>
    <div class="body"></div>
  </div>
  
	<div id="tx_panel" class="panel">
	  <div class="title no-select">
		  <div style="float:left;width:80px;margin-top:4px">
			SEND
		  </div>
		  <div style="float:right;" id="r_tx"></div>
		  <div style="float:right;margin-right:15px;margin-top:-2px;" id="l_tx"></div>
		  <div style="clear:both"></div>
	  </div>
	  <div class="body tx-layout">
		<div class="tx-wrap">
		  <div class="tx-row">
			<div class="tx-label">HEX</div>
			<div class="tx-box tx-hex" id="tx-hex"></div>
		  </div>
		  <div class="tx-row">
			<div class="tx-label">TEXT</div>
			<div class="tx-box tx-text" id="tx-text"></div>
		  </div>
		</div>
		<button style="height:100%;" class="ft-btn no-select" id="send">SEND</button>
	  </div>
	</div>

  <div id="kb_panel" class="panel  no-select">
	  <div class="title">
		  <div style="float:left;width:80px;margin-top:4px">
			KEYBOARD
		  </div>
		  <div style="float:right;margin-right:-3px" id="l_kb"></div>
		  <div style="float:right" id="r_kb"></div>
	  </div>
    <div class="body" id="kb_body"></div>
  </div>`;
  document.getElementById("send").addEventListener("click", sendBuffer);
}



function restartApp() {
	invoke('restart_app');
}
	
async function sendBuffer() {
	console.log('sendBuffer()', byte_buffer);
	if(byte_buffer.length === 0) {
		console.log('Buffer empty');
	}

	last_buffer = copyObj(byte_buffer);
	try {
		await invoke('send_bytes', {
		  path: current_port,
		  data: byte_buffer
		});
		emptyBuffer();
	} catch(e) {
		console.log('sendBuffer()', e);	
	}
}

async function reSendBuffer() {
	console.log('reSendBuffer()', last_buffer);
	if(last_buffer.length === 0) {
		console.log('Last buffer empty');
	}

	try {
		await invoke('send_bytes', {
		  path: current_port,
		  data: last_buffer
		});
	} catch(e) {
		console.log('reSendBuffer()', e);	
	}
}

function emptyBuffer() {
	byte_buffer = [];
	document.getElementById("tx-hex") .textContent = '';
	document.getElementById("tx-text").textContent = '';
}

async function openPort() {
	console.log('openPort()');
	try {
		await invoke('open_port', {
		  path: current_port,
		  baud: current_baud
		});
	} catch(e) {
		console.log('openPort()', e);	
	}
}

async function closePort() {
	console.log('closePort()');
	try {
		await invoke('close_port');
	} catch(e) {
		console.log('closePort()', e);
	}
}

async function renderSplit() {
	await Split(
	  ["#rx_panel", "#tx_panel", "#kb_panel"],
	  {
		direction: "vertical",
		sizes: [40, 20, 40],
		gutterSize: 6,
		minSize: [160, 120, 160],
	  }
	);
}

async function connect(first = false) {
	if(first && !auto_connect)
		return;
	openPort();
}
	
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPorts(ports) {
	const el = document.getElementById("select_ports");

	const rows = ports.map((p) => {
		  const path = esc(p.path);
		  const manu = esc(p.manufacturer);
		  const prod = esc(p.product);
		  const sn = esc(p.serial_number);
		  const type = esc(p.port_type);

		  const subtitleParts = [];	
		  if (manu) subtitleParts.push(manu);
		  if (prod) subtitleParts.push(prod);
		  if (sn) subtitleParts.push(`SN ${sn}`);
		  const subtitle = subtitleParts.join(" · ");

		  return `
			<div class="ft-row" role="row">
			  <button class="ft-btn" type="button" data-port="${path}">
				${path}
			  </button>

			  <div class="ft-meta">
				<div class="ft-sub">${subtitle || "<span class='ft-dim'>No USB details</span>"}</div>
			  </div>
			</div>
		  `;
    }).join("");
	el.innerHTML = rows;
}

function handlePorts() {
	const root = document.getElementById("select_ports");
	root.addEventListener("click", (e) => {
		const btn = e.target.closest(".ft-btn");
		console.log('handlePorts()',btn);
		if (!btn) 
			return;
		current_port = btn.getAttribute("data-port");
		console.log('current_port',current_port);
		console.log('close popup');
		Swal.close();
	});	
}

async function pickSerialPort(ports) {
    let chosen = null;

    const result = await Swal.fire({
		title: "Select a serial port",
		html: `
		  <div class="ft-wrap" role="table" aria-label="Serial ports" id="select_ports">
		  </div>
		  <div style="float:left;margin-top:2px;margin-left:5px;" id="auto_connect"></div>
		`,
		showConfirmButton: false,
		showCancelButton: false,
		allowOutsideClick: false,
		allowEscapeKey: false,
		focusCancel: false, 
		background: "#0b1220",
		color: "#e5e7eb",
		width: 720,
		customClass: {
		  popup: "ft-swal",
		  title: "ft-title",
		  htmlContainer: "ft-html",
		  cancelButton: "ft-cancel",
		},
		didOpen: () => {
			renderPorts(ports);
			handlePorts();
			const toggle = createToggle({
				label: "Auto connect",
				initial: auto_connect,
				onChange: (label, state) => {
					console.log(label, state);
					auto_connect = state;
				}
			});

			const qry = document.querySelector("#auto_connect");
			qry.appendChild(toggle);
			Swal.getPopup().focus();

		}
  });

}

function drawAsciiKeyboard(containerId, onKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const CTRL = [
    'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL',
    'BS','TAB','LF','VT','FF','CR','SO','SI',
    'DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB',
    'CAN','EM','SUB','ESC','FS','GS','RS','US'
  ];

  const frag = document.createDocumentFragment();

  for (let i = 0; i < 128; i++) {
    const btn = document.createElement('button');
    btn.className = 'ascii-key';

    const hex = i.toString(16).toUpperCase().padStart(2, '0');
    const dec = i.toString(10);

    let label;
    if (i < 32) label = CTRL[i];
    else if (i === 32) label = 'SPACE';
    else if (i === 127) label = 'DEL';
    else label = String.fromCharCode(i);

    btn.dataset.ascii = label;
    btn.dataset.hex = hex;
    btn.dataset.dec = dec;

    btn.innerHTML = `
      <span class="ascii-hex">${hex}</span>
      <span class="ascii-label">${label}</span>
      <span class="ascii-dec">${dec}</span>
    `;

    btn.addEventListener('click', () => {
      if (onKey) onKey(i, label);
    });

    frag.appendChild(btn);
  }

  container.innerHTML = '';
  container.appendChild(frag);
  container.blur();
}

// Classic control names 0..31
const ASCII_CTRL = [
  'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL',
  'BS','TAB','LF','VT','FF','CR','SO','SI',
  'DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB',
  'CAN','EM','SUB','ESC','FS','GS','RS','US'
];

function isEditableTarget(t) {
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || t.isContentEditable;
}

function toHex2(n) {
  return n.toString(16).toUpperCase().padStart(2, '0');
}

function asciiDisplayName(code) {
  if (code < 32) return `[${ASCII_CTRL[code]}]`;
//  if (code === 32) return '[SPACE]';
  if (code === 127) return '[DEL]';
  return String.fromCharCode(code);
}

function flashAsciiKey(code, ms = 300) {
  const el = document.querySelector(`.ascii-key[data-dec="${code}"]`);
  if (!el) return;
  el.classList.add('ascii-hot');
  window.setTimeout(() => el.classList.remove('ascii-hot'), ms);
  el.blur();
}

function mapKeyboardEventToAscii(e) {
  // Ignore keys that are never ASCII themselves
  const ignore = new Set([
    'Shift','Control','Alt','Meta','CapsLock','NumLock','ScrollLock',
    'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'PageUp','PageDown','Home','End','Insert',
    'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
    'ContextMenu'
  ]);
  if (ignore.has(e.key)) return null;

  // Ctrl combos (terminal-style)
  if (e.ctrlKey && !e.altKey && !e.metaKey) {
    // Ctrl+Space => NUL
    if (e.key === ' ' || e.code === 'Space') return 0;

    const k = e.key.length === 1 ? e.key : '';

    // Ctrl+A..Z => 1..26
    if (/^[a-z]$/i.test(k)) {
      return k.toUpperCase().charCodeAt(0) - 64;
    }

    // Ctrl+@ => NUL
    if (k === '@') return 0;

    // Ctrl+[ \ ] ^ _ => ESC..US (27..31)
    if (k === '[') return 27; // ESC
    if (k === '\\') return 28; // FS
    if (k === ']') return 29; // GS
    if (k === '^') return 30; // RS
    if (k === '_') return 31; // US

    return null;
  }

  // Named keys that map to ASCII control codes
  if (e.key === 'Enter') return 13;      // CR
  if (e.key === 'Tab') return 9;         // TAB
  if (e.key === 'Backspace') return 8;   // BS
  if (e.key === 'Escape') return 27;     // ESC
  if (e.key === 'Delete') return 127;    // DEL

  // Printable characters (includes shifted symbols) — only accept pure ASCII
  if (e.key.length === 1) {
    const code = e.key.charCodeAt(0);
    if (code >= 0 && code <= 127) return code;
  }

  return null;
}

/**
 * Installs a keyboard → ASCII capture.
 * @param {object} opts
 * @param {string} opts.hexDivId  - div showing hex bytes
 * @param {string} opts.textDivId - div showing text / [CTRL] tokens
 * @param {(byte:number)=>void} [opts.onByte] - optional callback per byte
 * @returns {{ byte_buffer:number[], detach:()=>void, clear:()=>void }}
 */
 
function installAsciiKeyboardCapture({ hexDivId, textDivId, onByte }) {
  hexEl = document.getElementById(hexDivId);
  textEl = document.getElementById(textDivId);
  if (!hexEl || !textEl) throw new Error('hexDivId/textDivId not found');

  function appendByte(code) {
    byte_buffer.push(code);

    const hx = toHex2(code);
    hexEl.textContent += (hexEl.textContent ? ' ' : '') + hx;

    const token = asciiDisplayName(code);
    textEl.textContent += token;

    flashAsciiKey(code, 300);
	latchAsciiKey(code, 1500);

    if (onByte) onByte(code);
  }

  function handler(e) {
    // Don’t hijack typing inside inputs
    if (isEditableTarget(e.target)) return;

    const code = mapKeyboardEventToAscii(e);
    if (code === null) return;

    // Stop browser focus moves/back navigation, etc.
    e.preventDefault();
    e.stopPropagation();

	if(!bs_enter) {
		if(code == 8) {
			if(byte_buffer.length === 0)
				return;
			byte_buffer.pop();

			if (hexEl.textContent.length <= 2)
			  hexEl.textContent = "";
			else
			  hexEl.textContent = hexEl.textContent.slice(0, -3);

			textEl.textContent = "";
			for (const code of byte_buffer) {
				textEl.textContent += asciiDisplayName(code);
			}
			return;
		} else if(code == 13) {
			sendBuffer();
			return;
		}
	}
    appendByte(code);
  }

  window.addEventListener('keydown', handler, { capture: true });

  return {
    byte_buffer,
    detach() {
      window.removeEventListener('keydown', handler, { capture: true });
    },
    clear() {
      byte_buffer.length = 0;
      hexEl.textContent = '';
      textEl.textContent = '';
    }
  };
}

function latchAsciiKey(code, ms = 1500) {
  const el = document.querySelector(`.ascii-key[data-dec="${code}"]`);
  if (!el) return;

  if (lastLatched) lastLatched.classList.remove('ascii-latched');
  lastLatched = el;

  clearTimeout(latchTimer);
  el.classList.add('ascii-latched');
  latchTimer = setTimeout(() => {
    el.classList.remove('ascii-latched');
    if (lastLatched === el) lastLatched = null;
  }, ms);
}

function insertPulldown({
  container,
  items,
  initial,
  onChange
}) {
  const select = document.createElement('select');
  select.className = 'tron-select';

  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    select.appendChild(opt);
  }

  if (initial !== undefined) {
    select.value = initial;
  }

  select.addEventListener('change', () => {
    onChange?.(select.value);
  });

  container.appendChild(select);

  return {
    set(value) {
      select.value = value;
    },
    get() {
      return select.value;
    },
    destroy() {
      select.remove();
    }
  };
}

export async function pickBaudRate() {
  const baudRates = [
    1200, 2400, 4800,
    9600, 14400, 19200,
    28800, 38400, 57600,
    115200, 230400, 460800,
    921600, 1000000
  ];

  const rows = baudRates.map(b => `
    <button class="ft-btn" type="button" data-baud="${b}">
      ${b.toLocaleString()}
    </button>
  `).join("");

  let chosen = null;

  const result = await Swal.fire({
    title: "Select baud rate",
	html: `
	  <div class="ft-grid">
		${rows}
	  </div>

	  <div class="ft-custom">
		<input
		  id="baud-input"
		  class="ft-input"
		  type="number"
		  min="1"
		  max="1000000"
		  placeholder="custom baud → Enter"
		/>
		<div class="ft-hint" style="margin-left:7px">Select a baud rate or type in a custom rate.</div>

	  </div>`,
    showConfirmButton: false,
    showCancelButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    background: "#0b1220",
    color: "#e5e7eb",
    width: 420,
    customClass: {
      popup: "ft-swal",
      title: "ft-title",
      htmlContainer: "ft-html",
    },
    didOpen: () => {
      const root = Swal.getHtmlContainer();

      root.addEventListener("click", (e) => {
        const btn = e.target.closest(".ft-btn");
        if (!btn) return;

        chosen = Number(btn.dataset.baud);
        Swal.close();
      });

      const input = root.querySelector("#baud-input");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const v = Number(input.value);
          if (Number.isFinite(v) && v > 0) {
            chosen = v;
            Swal.close();
          }
        }
      });

      Swal.getPopup().focus();
    }
  });

  if (chosen !== null) return chosen;
  return null;
}

export function createToggle({ label = "", initial = false, onChange }) {
  let state = !!initial;

  const wrap = document.createElement("div");
  wrap.className = "ft-toggle-wrap";

  const lbl = document.createElement("span");
  lbl.className = "ft-toggle-label";
  lbl.textContent = label;

  const btn = document.createElement("button");
  btn.className = "ft-toggle" + (state ? " on" : "");
  btn.type = "button";

  const knob = document.createElement("div");
  knob.className = "ft-toggle-knob";

  btn.appendChild(knob);
  wrap.appendChild(lbl);
  wrap.appendChild(btn);

  const setState = (v, fire = true) => {
    state = !!v;
    btn.classList.toggle("on", state);
    if (fire && typeof onChange === "function") {
		onChange(label, state);
	    wrap.blur();
	}
  };

  btn.addEventListener("click", () => setState(!state));

  wrap.set = (v) => setState(v, false);
  wrap.get = () => state;
  wrap.blur();
  return wrap;
}

function copyObj(o) {
  return JSON.parse(JSON.stringify(o));
}

async function loadBytes() {
  const arr = await invoke("load_bytes");
  return Uint8Array.from(arr);
}

async function saveBytes(data) {
  const bytes =
    data instanceof Uint8Array ? Array.from(data)
    : data instanceof ArrayBuffer ? Array.from(new Uint8Array(data))
    : Array.isArray(data) ? data
    : (() => { throw new Error("saveBytes expects Uint8Array | ArrayBuffer | number[]"); })();

  await invoke("save_bytes", { data: bytes });
}
