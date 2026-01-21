import './style.css';
import Split from "split.js";
import Swal from 'sweetalert2';
import { sparkline } from "@fnando/sparkline";

import { invoke } 		 from '@tauri-apps/api/core';
import { listen } 		 from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

const 	root 		 	= document.getElementById('app');
let		current_port 	= null;
let		current_baud 	= null;
let		ports			= null;
let 	lastLatched  	= null;
let 	latchTimer 	 	= 0;
let     opened		 	= false;
let		fail_msg	 	= null;
let 	bs_enter 	 	= false;
let		auto_connect 	= true;
let		auto_reconnect  = true;
let		echo 		 	= true;
let		EOL			 	= true;
let		CR 		 	 	= true;
let		LF 		 	 	= true;
let		scroll		 	= true;
let		texthex 	 	= true;
let 	hexEl 		 	= null;
let 	textEl 		 	= null;
let 	tx_buffer    	= [];
let 	last_buffer  	= [];
let		rx_buffer	 	= [];
let 	cap_buffer   	= [];
let 	capturing 	 	= false;
let 	cap_start_time  = null;
let     cap_timer_id  	= null;
let 	lastSpeedTime 	= null;
let		speedTimer		= null;
let		sparkTimer		= null;

const 	SPEED_INTERVAL 	= 500; // ms
const 	SPEED_POINTS 	= 100;
let 	speedByteAcc 	= 0;
let 	speedArray 		= [];

const 	GREEN = "\u{1F7E2}";
const 	RED   = "\u{1F534}";

const ASCII_CTRL = [
  'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL',
  'BS','TAB','LF','VT','FF','CR','SO','SI',
  'DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB',
  'CAN','EM','SUB','ESC','FS','GS','RS','US'
];

//=================================== main ==============================/

console.log('[Starting Port + Baud Selection]');
root.hidden   	= true;

await 			closePort(); // helps when in dev mode
await 			startListeners();
ports 			= await invoke('list_ports');
await   		renderApp();
await   		pickSerialPort(); // sets current_port internally
current_baud 	= await pickBaudRate();
await 		    renderSplit();

const l_rx 			= document.querySelector("#l_rx");
const r_rx 			= document.querySelector("#r_rx");
const l_tx 			= document.querySelector("#l_tx");
const r_tx 			= document.querySelector("#r_tx");
const l_kb 			= document.querySelector("#l_kb");
const r_kb 			= document.querySelector("#r_kb");
const el_rx 		= document.querySelector("#rx_body");
const el_rx_title   = document.getElementById("rx_title");
const el_tx_hex		= document.querySelector("#tx-hex");
const el_tx_text	= document.querySelector("#tx-text");
const el_connection = document.getElementById("connection");

let   bytesEl		= null;		// set when capture window is open
let   speedEl		= null;
let   timeEl		= null;
let   sparkEl		= null;

console.log('[Selected]', current_port, current_baud);

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
el_disconnect.addEventListener("click", function() {
	closePort();
});
el_disconnect.hidden = true;

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;" class="ft-btn ft-small" id="connect">Connect</button>'
);
const el_connect = document.getElementById("connect")
el_connect.addEventListener("click", openPort);
el_connect.hidden = true;

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;" class="ft-btn ft-small" id="clear_rx">Clear</button>'
);
const el_clear = document.getElementById("clear_rx")
el_clear.addEventListener("click", clearRX);
el_disconnect.hidden = true;

r_rx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;" class="ft-btn ft-small" id="cap_rx">Capture</button>'
);
const el_cap = document.getElementById("cap_rx")
el_cap.addEventListener("click", startCapture);

const tog_texthex = createToggle({
  label: "Text/Hex",
  initial: texthex,
  onChange: (label, state) => {
    console.log(label, state);
	texthex = state;
	dotexthex();
  }
});
l_rx.appendChild(tog_texthex);

const tog_eol = createToggle({
  label: "EOL",
  initial: EOL,
  onChange: (label, state) => {
    console.log(label, state);
	EOL = state;
	doEOL();
  }
});
l_rx.appendChild(tog_eol);

const tog_scroll = createToggle({
  label: "Scroll",
  initial: scroll,
  onChange: (label, state) => {
    console.log(label, state);
	scroll = state;
  }
});
l_rx.appendChild(tog_scroll);

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

r_tx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;margin-top:-2px" class="ft-btn ft-small" id="paste">Paste</button>'
);
document.getElementById("paste").addEventListener("click", paste);

r_tx.insertAdjacentHTML(
  'beforeend',
  '<button style="float:right;margin-right:10px;margin-top:-2px" class="ft-btn ft-small" id="clear_tx">Clear</button>'
);
document.getElementById("clear_tx").addEventListener("click", clearTX);

const tog_echo = createToggle({
  label: "Echo",
  initial: echo,
  onChange: (label, state) => {
    console.log(label, state);
	echo = state;
	doEcho();
  }
});
l_tx.appendChild(tog_echo);

const tog_cr = createToggle({
  label: "CR",
  initial: CR,
  onChange: (label, state) => {
    console.log(label, state);
	echo = state;
  }
});
l_tx.appendChild(tog_cr);

const tog_lf = createToggle({
  label: "LF",
  initial: LF,
  onChange: (label, state) => {
    console.log(label, state);
	echo = state;
  }
});
l_tx.appendChild(tog_lf);

//-------------------------KB ------------------------/

const tog_bs_enter = createToggle({
  label: "BS/Enter",
  initial: bs_enter,
  onChange: (label, state) => {
    console.log(label, state);
	bs_enter = state;
  }
});
l_kb.appendChild(tog_bs_enter);

el_rx_title.innerHTML = `${current_port}&nbsp;${current_baud} Baud`

await drawAsciiKeyboard('kb_body', (code, label) => {
  console.log('click_byte', code);
	  tx_buffer.push(code);
	  renderTXBytes([code]);	
});

const tx = installAsciiKeyboardCapture({
  hexDivId: 'tx-hex',
  textDivId: 'tx-text',
  onByte: (byte) => {
	  console.log('key_byte',byte);
  }
});

await connect(true);
root.hidden = false;

//=================================== helpers ==============================/

function clearRX() {
	el_rx.innerHTML = '';
	rx_buffer = [];
}

function clearTX() {
	el_tx_hex.innerHTML = '';
	el_tx_text.innerHTML = '';
	tx_buffer = [];
}

function doScroll() {
	if(scroll)
		el_rx.scrollTop = el_rx.scrollHeight;
}

function dotexthex() {
	document.querySelectorAll('.ascii-hex').forEach(el => {
		el.style.display = texthex ? '' : 'none'
	});
	document.querySelectorAll('.ascii-hide').forEach(el => {
		 el.style.opacity = texthex ? '1' : '0.4';
	})
	document.querySelectorAll('.border-hide').forEach(el => {
		el.style.borderWidth = texthex ? '2px' : '0';
	});
	el_rx.style.gridTemplateColumns = texthex ? "repeat(auto-fit, 30px)" : "repeat(auto-fit, 17px)";
}

function doEOL() {
	document.querySelectorAll('.ascii-break').forEach(el => {
		el.style.display = EOL ? '' : 'none'
	});
}

function doEcho() {
	document.querySelectorAll('.ascii-tx').forEach(el => {
		el.style.display = echo ? '' : 'none'
	});
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('Clipboard read failed:', err);
    return null;
  }
}

function renderTXBytes(bytes) {
	bytes.forEach(code => {
		const hx = toHex2(code);
		hexEl.textContent += (hexEl.textContent ? ' ' : '') + hx;

		const token = asciiDisplayName(code);
		textEl.textContent += token;
	});
}

async function paste() {
	const text = await pasteFromClipboard();
	if (!text) return;

	const bytes = Array.from(text, ch => ch.charCodeAt(0));
    tx_buffer.push(...bytes);

	renderTXBytes(bytes);
}

function updateConnected() {
	console.log('updateConnected()');
	try {
		if(opened) { 
			console.log('port open');
			el_connection.innerHTML = GREEN+' Connected'
			el_connect.hidden 	 = true;
			el_disconnect.hidden = false;
		} else {
			console.log('port close');
			if(fail_msg !== null)
				var msg = ' Access Denied';
			else
				var msg = ' Disconnected';
			el_connection.innerHTML = RED+msg;
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
		  <div id="rx_title" style="float:left;margin-right:12px;padding-top:2px"></div>
		  <div style="float:left;padding-top:2px" id="connection"></div>
		  <div style="float:right;margin-right:-3px;margin-top:-2px;" id="r_rx"></div>
		  <div style="float:right;margin-right:15px;margin-top:-2px;" id="l_rx"></div>
		  <div style="clear:both"></div>
	  </div>
    <div class="body" id="rx_body"></div>
  </div>
  
	<div id="tx_panel" class="panel">
	  <div class="title no-select">
		  <div style="float:left;width:80px;padding-top:2px">
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
		<div style="padding-top:2px">
		  <div style="float:left;width:80px;">
			KEYBOARD
		  </div>
		  <div style="float:left;font-size:10px;margin-bottom:-2px;margin-top:-1px">
			  <div style="float:left" class="bracket-open">
				&nbsp;
			  </div>
			  <div style="float:left;margin-top:-4px;color:#22ff88">
				HEX
			  </div>
			  <div style="float:left;margin-left:-10px;margin-top:8px;color:white">
				ASCII
			  </div>
			  <div style="float:left;margin-left:-10px;margin-top:-4px;color:#ffd84d">
				DEC
			  </div>
			  <div style="float:left" class="bracket-close">
				&nbsp;
			  </div>  
		  </div>
		  <div style="float:right;margin-right:-3px;margin-top:-3px;" id="l_kb"></div>
		  <div style="float:right" id="r_kb"></div>
		  </div>
	  </div>
    <div class="body" id="kb_body"></div>
  </div>`;
  document.getElementById("send").addEventListener("click", sendBuffer);
}

async function restartApp() {
	await invoke('close_port');
	setTimeout(function() {
		invoke('restart_app');
	},100);
}
	
async function sendBuffer() {
	console.log('sendBuffer()', tx_buffer);
	if(tx_buffer.length === 0) {
		console.log('Buffer empty');
	}

	try {
		await invoke('send_bytes', {
		  path: current_port,
		  data: tx_buffer
		});
		last_buffer = copyObj(tx_buffer);
		let buf = copyObj(tx_buffer);
		if(CR) {
			buf.push(13);
			console.log('CR',CR);
		} 
		if(LF) {
			buf.push(10);
			console.log('LF',LF);
		}
		console.log(buf);
		let frag = renderRX(buf, true);
		el_rx.appendChild(frag);
		doEcho();
		doEOL();
		dotexthex();
		doScroll();
		clearTX();
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
		let buf = copyObj(last_buffer);
		if(CR)
			buf.push(13);
		if(LF)
			buf.push(10);
		let frag = renderRX(buf, true);
		el_rx.appendChild(frag);
		doEcho();
		doEOL();
		dotexthex();
		doScroll();
	} catch(e) {
		console.log('reSendBuffer()', e);	
	}
}

function displayBuffer() {
	for(let a of last_buffer) {
		
	}
	
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
		gutterSize: 4,
		minSize: [160, 120, 160],
	  }
	);
}

async function connect(first = false) {
	if(first && !auto_connect) {
		el_connect.hidden = false;
		updateConnected();
		return;
	}
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

	ports.sort((a, b) => {
	  const w = p =>
		/^COM\d+/i.test(p) ? 0 :
		p.includes("ttyACM") ? 1 :
		p.includes("ttyUSB") ? 2 : 3;

	  return w(a.path) - w(b.path) ||
			 a.path.localeCompare(b.path, undefined, { numeric: true });
	});

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

async function pickSerialPort() {
    const result = await Swal.fire({
		title: "Select a COM port",
		html: 
		  `<div class="ft-wrap" role="table" aria-label="Serial ports" id="select_ports"></div>
		  <div class="ft-custom" style="margin-left:5px;float:left;text-align:left;width:300px;">
			<input 
		      style="width:200px"
			  id="path-input"
			  class="ft-input"
			  placeholder="custom device path → Enter"
			/>
		  </div>
		   <div style="float:right;margin-top:12px;margin-right:4px;" id="auto_connect"></div>
		   <div sytle="clear:both"></div><br/><br/>  
		  <div class="ft-hint" style="margin-left:7px;float:left;">Select a COM port or type in a custom path.</div>`,
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
			const root = Swal.getHtmlContainer();
			const input = root.querySelector("#path-input");
			input.addEventListener("keydown", (e) => {
				console.log(input.value);
				if (e.key === "Enter") {
					if(!input.value.length)
						return;
					current_port = input.value;
					Swal.close();
				}
			});

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

function renderRX(values, tx = false) {
  const frag = document.createDocumentFragment();

  for (let i = 0; i < values.length; i++) {
    const code = values[i];
    if (code < 0 || code > 127) continue;

    const hex = code.toString(16).toUpperCase().padStart(2, '0');

    let label;
    if (code < 32) label = ASCII_CTRL[code];
    else if (code === 32) label = 'SPACE';
    else if (code === 127) label = 'DEL';
    else label = String.fromCharCode(code);

    const cell = document.createElement('div');
    cell.className = tx ? 'ascii-tx' : 'ascii-rx';
	cell.classList.add('border-hide');
	
    if (code === 32) {
      cell.innerHTML = `
        <span class="ascii-hex">${hex}</span>
        <span class="ascii-label ascii-small">${label}</span>
      `;
    } else {
      cell.innerHTML = `
        <span class="ascii-hex">${hex}</span>
        <span class="ascii-label">${label}</span>
      `;
    }

	if (code === 13 || code === 10 || code === 32) 
		cell.classList.add('ascii-hide');

    frag.appendChild(cell);

    // ---- newline handling (NO swallowing) ----
    if (code === 13) { // CR
      // CRLF → single break after LF
      if (values[i + 1] !== 10) {
        frag.appendChild(makeAsciiBreak());
      }
    } else if (code === 10) { // LF
      frag.appendChild(makeAsciiBreak());
    }
    // -----------------------------------------
  }

  return frag;
}

function makeAsciiBreak() {
  const br = document.createElement('div');
  br.className = 'ascii-break';
  return br;
}


function drawAsciiKeyboard(containerId, onKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const frag = document.createDocumentFragment();

  for (let i = 0; i < 128; i++) {
    const btn = document.createElement('button');
    btn.className = 'ascii-key';

    const hex = i.toString(16).toUpperCase().padStart(2, '0');
    const dec = i.toString(10);

    let label;
    if (i < 32) label = ASCII_CTRL[i];
    else if (i === 32) label = 'SPACE';
    else if (i === 127) label = 'DEL';
    else label = String.fromCharCode(i);

    btn.dataset.ascii = label;
    btn.dataset.hex = hex;
    btn.dataset.dec = dec;

    btn.innerHTML = `
      <span class="ascii-hex2">${hex}</span>
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
 * @returns {{ tx_buffer:number[], detach:()=>void, clear:()=>void }}
 */
 
function installAsciiKeyboardCapture({ hexDivId, textDivId, onByte }) {
  hexEl = document.getElementById(hexDivId);
  textEl = document.getElementById(textDivId);
  if (!hexEl || !textEl) throw new Error('hexDivId/textDivId not found');

  function appendByte(code) {
    tx_buffer.push(code);

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
			if(tx_buffer.length === 0)
				return;
			tx_buffer.pop();

			if (hexEl.textContent.length <= 2)
			  hexEl.textContent = "";
			else
			  hexEl.textContent = hexEl.textContent.slice(0, -3);

			textEl.textContent = "";
			for (const code of tx_buffer) {
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
    tx_buffer,
    detach() {
      window.removeEventListener('keydown', handler, { capture: true });
    },
    clear() {
      tx_buffer.length = 0;
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

function createToggle({ label = "", initial = false, onChange }) {
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

// bytes (dec array or Uint8Array) -> ASCII bytes representing "HH HH HH"
function array2HEX(bytes) {
  if (!bytes || typeof bytes.length !== "number") return [];

  const out = []; // decimal bytes (ASCII)

  let first = true;
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i];
    if (typeof v !== "number") continue;
    if (v < 0 || v > 127) continue; // ignore >127 (and negatives)

    const hx = v.toString(16).toUpperCase().padStart(2, "0");

    if (!first) out.push(0x20); // space
    first = false;

    out.push(hx.charCodeAt(0), hx.charCodeAt(1));
  }

  return out;
}

function HEX2array(asciiBytes) {
  if (!asciiBytes || typeof asciiBytes.length !== "number") return [];

  const out = [];
  let token = "";

  for (let i = 0; i < asciiBytes.length; i++) {
    const v = asciiBytes[i];
    if (typeof v !== "number") continue;
    if (v < 0 || v > 255) continue;

    const ch = String.fromCharCode(v);

    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
      // end of token
      if (token.length === 2 && /^[0-9a-fA-F]{2}$/.test(token)) {
        const val = parseInt(token, 16);
        if (val <= 127) out.push(val); // ignore >127 as requested
      }
      token = "";
    } else {
      token += ch;
      if (token.length === 2) {
        if (/^[0-9a-fA-F]{2}$/.test(token)) {
          const val = parseInt(token, 16);
          if (val <= 127) out.push(val);
        }
        token = "";
      }
    }
  }

  // handle trailing token (no space at end)
  if (token.length === 2 && /^[0-9a-fA-F]{2}$/.test(token)) {
    const val = parseInt(token, 16);
    if (val <= 127) out.push(val);
  }

  return out;
}

async function pickFileType(save = true) {
  return new Promise((resolve, reject) => {
    Swal.fire({
      title: save ? "Save type" : "Load type",
      html: `
        <div class="ft-wrap" role="table">
          <div class="ft-row" role="row">
            <button class="ft-btn" type="button" style="width:300px" data-type="text">Text (As-is)</button>
          </div>
          <div class="ft-row" role="row">
            <button class="ft-btn" type="button" style="width:300px" data-type="raw">Raw (As-is)</button>
          </div>
          <div class="ft-row" role="row">
            <button class="ft-btn" type="button" style="width:300px" data-type="hex">HEX Representation (In text)</button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
      background: "#0b1220",
      color: "#e5e7eb",
      width: 370,
      customClass: {
        popup: "ft-swal",
        title: "ft-title",
        htmlContainer: "ft-html",
        cancelButton: "ft-cancel",
      },
      didOpen: () => {
        const popup = Swal.getPopup();

        popup.addEventListener("click", (e) => {
          const btn = e.target.closest(".ft-btn");
          if (!btn) return;

          const selection = btn.getAttribute("data-type");

          Swal.close();
          resolve(selection);
        });
      },
    }).then((result) => {
      if (result.isDismissed) {
        resolve(null); // user cancelled
      }
    });
  });
}

async function loadBytes() {
	let type = await pickFileType();
	let data = await invoke("load_bytes");
	if(type === 'hex') {
		data = HEX2array(data);
	}
	console.log('loadBytes()', data);
	clearTX();
	tx_buffer = data;
	renderTXBytes(tx_buffer);	
}

async function saveBytes(buff_t = 'rx') {
	try {
		let type = await pickFileType();
		if(type === null)
			return;
		
		if(buff_t === 'rx')
			var data = copyObj(rx_buffer);
		else if(buff_t === 'cap')
			var data = copyObj(cap_buffer);
		else 
			console.log('ERROR: Unknown buffer type');
		
		let filename = 'unnamed.raw';
		if(type === 'text')
			filename = 'unnamed.txt';
		else if(type === 'hex') {
			filename = 'unnamed.hex';
			data = array2HEX(data);
		}
		console.log('saveBytes()', data.length);
		await invoke("save_bytes", { filename, data});
	} catch (e) {
		console.log('saveBytes() ERROR', buff_t, type, e);
	}
}

async function startCapture() {
	const res = await highSpeedCaptureDialog();
    capturing = false;
	stopCaptureTimer();
	stopSpeedTimer();
	stopSparkTimer();

	if(res.action === 'save')
		saveBytes('cap');
}

function highSpeedCaptureDialog() {
  return new Promise((resolve) => {
    Swal.fire({
      title: "High speed capture",
      html: 
	   `<div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
          <div style="display:flex; gap:10px;">
            <button id="hs-start" class="ft-btn" style="width:90px;">Start</button>
            <button id="hs-stop" class="ft-btn" style="width:90px;" disabled>Stop</button>
            <button id="hs-save" class="ft-btn" style="width:90px;" disabled>Save</button>
          </div>
		  <div style="font-size:13px;width:100%;">
			  <div id="hs-status" style="margin-top:5px;opacity:0.80;">
				Idle – no data
			  </div>
			  <div style="margin-top:10px;">
				  <div style="float:left;width:210px">
					  <div style="float:left">Elapsed:&nbsp;</div>
					  <div id="hs-time" style="float:left">00h 00m 00s</div>
					  <div style="clear:both"></div>
				  </div>
				  <div style="float:left;width:120px">
					  <div style="float:left">Speed:&nbsp;</div>
					  <div id="hs-speed" style="float:left">0 B/s</div>
					  <div style="clear:both"></div>
				  </div>
				  <div style="float:right;width:100px">
					  <div id="hs-bytes" style="float:right">0 B</div>
					  <div style="float:right">Size:&nbsp;</div>
					  <div style="clear:both"></div>
				  </div>
				  <div style="clear:both"></div>
			  </div>
			  <div style="margin-top:10px;width:500px;height:120px;border:1px solid grey;margin-left:-5px">
				<svg id="hs-spark" class="sparkline" width="500" height="120" stroke-width="1"></svg>
			  </div>
		  <div>
        </div>`,
      showConfirmButton: false,
      showCancelButton: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
      background: "#0b1220",
      color: "#e5e7eb",
      width: 550,
      customClass: {
        popup: "ft-swal",
        title: "ft-title",
        cancelButton: "ft-cancel",
      },
      didOpen: () => {
        const startBtn = document.getElementById("hs-start");
        const stopBtn  = document.getElementById("hs-stop");
        const saveBtn  = document.getElementById("hs-save");
        const statusEl = document.getElementById("hs-status");
        bytesEl 	   = document.getElementById("hs-bytes");
        speedEl 	   = document.getElementById("hs-speed");
        timeEl 	   	   = document.getElementById("hs-time");
        sparkEl    	   = document.getElementById("hs-spark");

        function setState(state) {
          if (state === "idle") {
            capturing = false;
            startBtn.disabled = false;
            stopBtn.disabled  = true;
            saveBtn.disabled  = true;
            statusEl.textContent = "Idle – no data";
          }

          if (state === "capturing") {
            capturing = true;
			cap_buffer = [];
			speedArray = new Array(SPEED_POINTS).fill(0.0001);
			cap_start_time = getSecs();
			lastSpeedTime = performance.now();
			startCaptureTimer();
			startSpeedTimer();
			startSparkTimer();
            startBtn.disabled = true;
            stopBtn.disabled  = false;
            saveBtn.disabled  = true;
            statusEl.textContent = "Capturing… receiving data";
          }

          if (state === "stopped") {
            capturing = false;
			stopCaptureTimer()
 			stopSpeedTimer();
			stopSparkTimer();
            startBtn.disabled = true;
            stopBtn.disabled  = true;
            saveBtn.disabled  = false;
            statusEl.textContent = "Capture stopped – ready to save";
          }
        }

        // initial state
        setState("idle");

        startBtn.addEventListener("click", () => {
          setState("capturing");
          // start capture loop externally
        });

        stopBtn.addEventListener("click", () => {
          setState("stopped");
          // stop capture loop externally
        });

        saveBtn.addEventListener("click", () => {
  		  Swal.close();
          resolve({ action: "save" });
        });
      }
    }).then(() => {
      resolve({ action: "cancel" });
    });
  });
}

function getSecs() {
  return performance.now() * 0.001;
}

// bytes → human readable
function niceBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
  if (n < 1024*1024*1024) return `${(n/1024/1024).toFixed(2)} MB`;
  return `${(n/1024/1024/1024).toFixed(2)} GB`;
}

function niceBytesPerSecond(bps) {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024*1024) return `${(bps/1024).toFixed(1)} KB/s`;
  return `${(bps/1024/1024).toFixed(2)} MB/s`;
}

function niceTime(sec) {
  sec = Math.floor(sec);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return (
    h.toString().padStart(2, '0') + 'h ' +
    m.toString().padStart(2, '0') + 'm ' +
    s.toString().padStart(2, '0') + 's'
  );
}

function startCaptureTimer() {
  cap_start_time = getSecs();

  cap_timer_id = setInterval(() => {
    timeEl.textContent = niceTime(getSecs() - cap_start_time);
  }, 100);
}

function stopCaptureTimer() {
  if (cap_timer_id) {
    clearInterval(cap_timer_id);
    cap_timer_id = null;
  }
}

function startSpeedTimer() {
	speedTimer = setInterval(() => {
	  const now = performance.now();
	  if (now - lastSpeedTime > SPEED_INTERVAL) {
		speedEl.textContent = niceBytesPerSecond(0);
	  }
	}, SPEED_INTERVAL);
}

function stopSpeedTimer() {
	if(speedTimer)
		clearInterval(speedTimer);
	speedTimer = null;
}

function pushSpeed(value) {
  speedArray.push(value);
  if (speedArray.length > SPEED_POINTS) {
    speedArray.shift();
  }
  console.log(speedArray);
  sparkline(sparkEl, speedArray);
}

function startSparkTimer() {
	sparkTimer = setInterval(() => {
	  const now = performance.now();
	  if (now - lastSpeedTime >= SPEED_INTERVAL) {
		pushSpeed(0);
		speedEl.textContent = niceBytesPerSecond(0);
		lastSpeedTime = now;
	  }
	}, SPEED_INTERVAL);
}

function stopSparkTimer() {
	if(sparkTimer)
		clearInterval(sparkTimer);
	sparkTimer = null;
}

async function startListeners() {
	await listen('serial_rx', (event) => {
		try {
			const bytes = new Uint8Array(event.payload);
			if (capturing) {
			  cap_buffer.push(...bytes);

			  speedByteAcc += bytes.length;

			  const now = performance.now();
			  if (now - lastSpeedTime >= SPEED_INTERVAL) {
				const dt = (now - lastSpeedTime) / 1000;
				const bps = speedByteAcc / dt;

				speedEl.textContent = niceBytesPerSecond(bps);
				pushSpeed(bps);

				speedByteAcc = 0;
				lastSpeedTime = now;
			  }

			  bytesEl.textContent = niceBytes(cap_buffer.length);
			  return;
			}

			rx_buffer.push(...bytes);
			let frag = renderRX(bytes, false);
			el_rx.appendChild(frag);
			doEcho();
			dotexthex();
			doScroll();
			console.log('RX length:', bytes.length);
		} catch (e) {
			console.log('serial_rx',e);
		}
	});

	await listen('serial-ports-changed', (event) => {
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

	await listen('serial_state', (event) => {
		try {
			const val = event.payload;
			console.log('serial_state',val);
			if(val.includes('failed'))
				fail_msg = 'Access Denied';
			else
				fail_msg = null;
			opened = val.includes('opened');
			updateConnected();
		} catch (e) {
			console.log('serial_state',e);
		}
	});
}
