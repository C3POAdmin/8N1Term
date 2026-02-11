
/************ TX **************/

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

    // ---- label resolution (gfx only) ----
    if (code < 32) {
      label = ASCII_CTRL[code] ?? '';
    } else if (code === 32) {
      label = 'SPACE';
      isPrintable = true;
    } else if (code === 127) {
      label = 'DEL';
    } else if (code >= 0x20 && code <= 0x7E) {
      label = String.fromCharCode(code);
      isPrintable = true;
    }
    // 128–255 → intentionally blank label
    // ------------------------------------

    const cell = document.createElement('div');
    cell.className = tx ? 'ascii-tx' : 'ascii-rx';
    cell.classList.add('border-hide');
	//if(checksum)
	//	cell.classList.add('ascii-checksum');
		

    cell.innerHTML = `
      <span class="ascii-hex">${hex}</span>
      <span class="ascii-label ${!isPrintable ? 'ascii-raw' : ''} ${code == 32 ? 'ascii-small' : ''}">
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