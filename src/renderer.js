
/************ TX **************/
export function renderTXBytes(bytes) {
	bytes.forEach(code => {
		const hx = toHex2(code);
		hexEl.textContent += (hexEl.textContent ? ' ' : '') + hx;

		const token = asciiDisplayName(code);
		textEl.textContent += token;
	});
}

export function asciiDisplayName(code) {
  if (code < 32) return `[${ASCII_CTRL[code]}]`;

  if (code === 127) return '[DEL]';
  if (code > 127) return `[${toHex2(code)}]`;
  return String.fromCharCode(code);
}

/******************* RX *************/

export function renderRXBytes(values, tx = false, checksum = false) {
  const frag = document.createDocumentFragment();

  for (let i = 0; i < values.length; i++) {
    const code = values[i];
    if (code < 0 || code > 255) continue;

    const hex = code.toString(16).toUpperCase().padStart(2, '0');

    let label = '';
    let isPrintable = false;

	let isAsciiPrintable = false;
	let useSmallGlyph = false;

	if (code >= 0x21 && code <= 0x7E) {
	  label = String.fromCharCode(code);
	  isAsciiPrintable = true;
	  useSmallGlyph = true;
	} else if (code === 0x20) {
	  label = 'SPACE';
	} else if (code === 0x7F) {
	  label = 'DEL';
	} else if (code < 0x20) {
	  label = ASCII_CTRL[code] ?? '';
	} else {
	  label = hex;
	}

	const cell = document.createElement('div');
	cell.className = tx ? 'ascii-tx' : 'ascii-rx';
	cell.classList.add('border-hide');

	cell.innerHTML = `
	  <span class="ascii-hex">${hex}</span>
	  <span class="ascii-label 
		${!isAsciiPrintable ? 'ascii-raw' : ''} 
		${useSmallGlyph ? 'ascii-small' : ''}">
		${label}
	  </span>
	`;
    // Hide layout-only bytes
    if (code === 13 || code === 10 || code === 32) {
      cell.classList.add('ascii-hide');
    }

    frag.appendChild(cell);

    // ---- newline handling (NO swallowing) ----
    if (code === 13) {            // CR
      if (values[i + 1] !== 10) {
        frag.appendChild(makeAsciiBreak());
      }
    } else if (code === 10) {     // LF
      frag.appendChild(makeAsciiBreak());
    }
    // -----------------------------------------
  }

  return frag;
}

export const ASCII_CTRL = [
  'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL',
  'BS','TAB','LF','VT','FF','CR','SO','SI',
  'DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB',
  'CAN','EM','SUB','ESC','FS','GS','RS','US'
];
/**************** Helpers *****************/

function makeAsciiBreak() {
  const br = document.createElement('div');
  br.className = 'ascii-break';
  return br;
}

function toHex2(n) {
  return n.toString(16).toUpperCase().padStart(2, '0');
}