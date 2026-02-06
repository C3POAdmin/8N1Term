import { CHECKSUM_DEFS } from './checksum_defs.js'

/* ============================
   Public entry
   ============================ */

export function computeChecksum(dataBytes, CHECKSUM_TYPE) {
  const def = CHECKSUM_DEFS[CHECKSUM_TYPE.def_no];
  if (!def) throw new Error('Invalid checksum definition index');

  switch (def.type) {
    case 'CRC':
      return crcEngine(dataBytes, def, CHECKSUM_TYPE);

    case 'XOR':
      return xorEngine(dataBytes, def, CHECKSUM_TYPE);

    case 'SUM':
      return sumEngine(dataBytes, def);

    default:
      throw new Error(`Unsupported checksum type: ${def.type}`);
  }
}

/* ============================
   CRC ENGINE
   ============================ */

function crcEngine(data, def, state) {
  const width = def.width;
  const mask = (1 << width) - 1;

  const poly = state.poly ? state.poly_value : def.poly;
  let crc    = state.init ? state.init_value : def.init;

  for (let byte of data) {
    if (def.reflectIn) byte = reflect8(byte);
    crc ^= (byte << (width - 8)) & mask;

    for (let i = 0; i < 8; i++) {
      crc = (crc & (1 << (width - 1)))
        ? ((crc << 1) ^ poly)
        : (crc << 1);
      crc &= mask;
    }
  }

  if (def.reflectOut) crc = reflectN(crc, width);

  crc ^= def.xorOut ?? 0;

  return crcToByteArray(crc, width);
}

/* ============================
   XOR ENGINE
   ============================ */

function xorEngine(data, def, state) {
  let xor = state.xorSeed ? state.xorSeed_value : def.xorSeed;

  for (let b of data) xor ^= b;

  return [xor & 0xFF];
}

/* ============================
   SUM ENGINE
   ============================ */

function sumEngine(data, def) {
  let sum = 0;
  for (let b of data) sum += b;

  if (def.width === 8) {
    return [sum & 0xFF];
  }

  if (def.width === 16) {
    return [
      (sum >> 8) & 0xFF,
      sum & 0xFF
    ];
  }

  throw new Error('Unsupported SUM width');
}

/* ============================
   Helpers
   ============================ */

function reflect8(x) {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r;
}

function reflectN(x, bits) {
  let r = 0;
  for (let i = 0; i < bits; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r;
}

function crcToByteArray(crc, width) {
  if (width === 8) {
    return [crc & 0xFF];
  }

  if (width === 16) {
    return [
      (crc >> 8) & 0xFF,
      crc & 0xFF
    ];
  }

  throw new Error('Unsupported CRC width');
}
