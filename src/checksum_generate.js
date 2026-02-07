import { CHECKSUM_DEFS } from './checksum_defs.js';

/* =========================================================
   Public entry
   ========================================================= */

export function generateChecksumCode(langId, CHECKSUM_TYPE) {
  const def = CHECKSUM_DEFS[CHECKSUM_TYPE.def_no];
  if (!def) throw new Error('Invalid checksum definition');

  switch (langId) {
    case 'c':   return emitC(def, CHECKSUM_TYPE);
    case 'cpp': return emitC(def, CHECKSUM_TYPE); // same core
    case 'cs':  return emitCSharp(def, CHECKSUM_TYPE);
    case 'js':  return emitJS(def, CHECKSUM_TYPE);
    case 'py':  return emitPython(def, CHECKSUM_TYPE);
    case 'rs':  return emitRust(def, CHECKSUM_TYPE);
    default:
      throw new Error(`Unsupported language: ${langId}`);
  }
}

function resolve(def, state, key) {
  if (key === 'poly') return state.poly ? state.poly_value : def.poly;
  if (key === 'init') return state.init ? state.init_value : def.init;
  if (key === 'xorSeed') return state.xorSeed ? state.xorSeed_value : def.xorSeed;
  return null;
}

function emitC(def, state) {
  if (def.type === 'CRC') {
    const poly = resolve(def, state, 'poly');
    const init = resolve(def, state, 'init');

    return `
#include <stdint.h>

static uint8_t reflect8(uint8_t x)
{
    uint8_t r = 0;
    for (int i = 0; i < 8; i++) {
        r = (r << 1) | (x & 1);
        x >>= 1;
    }
    return r;
}

static uint16_t reflect16(uint16_t x)
{
    uint16_t r = 0;
    for (int i = 0; i < 16; i++) {
        r = (r << 1) | (x & 1);
        x >>= 1;
    }
    return r;
}
	
uint16_t crc_${def.name.replace(/[^A-Z0-9]/gi, '_').toLowerCase()}(
    const uint8_t *data, size_t len
) {
    uint16_t crc = 0x${init.toString(16).toUpperCase()};

    while (len--) {
        uint8_t b = *data++;
${def.reflectIn ? '        b = reflect8(b);\n' : ''}
        crc ^= (uint16_t)b << 8;

        for (int i = 0; i < 8; i++) {
            if (crc & 0x8000)
                crc = (crc << 1) ^ 0x${poly.toString(16).toUpperCase()};
            else
                crc <<= 1;
        }
    }
${def.reflectOut ? '    crc = reflect16(crc);\n' : ''}
    return crc ^ 0x${def.xorOut.toString(16).toUpperCase()};
}
`.trim();
  }

  if (def.type === 'XOR') {
    const seed = resolve(def, state, 'xorSeed');
    return `
uint8_t xor8(const uint8_t *data, size_t len) {
    uint8_t x = 0x${seed.toString(16).toUpperCase()};
    while (len--) x ^= *data++;
    return x;
}
`.trim();
  }

  if (def.type === 'SUM') {
    return `
uint16_t sum${def.width}(const uint8_t *data, size_t len) {
    uint32_t s = 0;
    while (len--) s += *data++;
    return s & 0x${def.width === 8 ? 'FF' : 'FFFF'};
}
`.trim();
  }
}

function emitJS(def, state) {
  if (def.type === 'CRC') {
    const poly = resolve(def, state, 'poly');
    const init = resolve(def, state, 'init');

    return `
function reflect8(x) {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r & 0xFF;
}

function reflect16(x) {
  let r = 0;
  for (let i = 0; i < 16; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r & 0xFFFF;
}

function crc(data) {
  let crc = 0x${init.toString(16).toUpperCase()};

  for (let b of data) {
${def.reflectIn ? '    b = reflect8(b);\n' : ''}
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0x${poly.toString(16).toUpperCase()})
        : (crc << 1);
      crc &= 0xFFFF;
    }
  }
${def.reflectOut ? '  crc = reflect16(crc);\n' : ''}
  return crc ^ 0x${def.xorOut.toString(16).toUpperCase()};
}
`.trim();
  }

  if (def.type === 'XOR') {
    const seed = resolve(def, state, 'xorSeed');
    return `
function xor8(data) {
  let x = 0x${seed.toString(16).toUpperCase()};
  for (let b of data) x ^= b;
  return x & 0xFF;
}
`.trim();
  }

  if (def.type === 'SUM') {
    return `
function sum${def.width}(data) {
  let s = 0;
  for (let b of data) s += b;
  return s & 0x${def.width === 8 ? 'FF' : 'FFFF'};
}
`.trim();
  }
}

function emitPython(def, state) {

  if (def.type === 'CRC') {
    const poly = resolve(def, state, 'poly');
    const init = resolve(def, state, 'init');

    return `
def reflect8(x):
    r = 0
    for _ in range(8):
        r = (r << 1) | (x & 1)
        x >>= 1
    return r & 0xFF


def reflect16(x):
    r = 0
    for _ in range(16):
        r = (r << 1) | (x & 1)
        x >>= 1
    return r & 0xFFFF


def crc(data):
    crc = 0x${init.toString(16).toUpperCase()}

    for b in data:
${def.reflectIn ? '        b = reflect8(b)\n' : ''}
        crc ^= b << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x${poly.toString(16).toUpperCase()}) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF

${def.reflectOut ? '    crc = reflect16(crc)\n' : ''}
    return crc ^ 0x${def.xorOut.toString(16).toUpperCase()}
`.trim();
  }

  if (def.type === 'XOR') {
    const seed = resolve(def, state, 'xorSeed');

    return `
def xor8(data):
    x = 0x${seed.toString(16).toUpperCase()}
    for b in data:
        x ^= b
    return x & 0xFF
`.trim();
  }

  if (def.type === 'SUM') {
    return `
def sum${def.width}(data):
    s = 0
    for b in data:
        s += b
    return s & 0x${def.width === 8 ? 'FF' : 'FFFF'}
`.trim();
  }
}


function emitRust(def, state) {

  if (def.type === 'CRC') {
    const poly = resolve(def, state, 'poly');
    const init = resolve(def, state, 'init');

    return `
fn reflect8(mut x: u8) -> u8 {
    let mut r: u8 = 0;
    for _ in 0..8 {
        r = (r << 1) | (x & 1);
        x >>= 1;
    }
    r
}

fn reflect16(mut x: u16) -> u16 {
    let mut r: u16 = 0;
    for _ in 0..16 {
        r = (r << 1) | (x & 1);
        x >>= 1;
    }
    r
}

fn crc(data: &[u8]) -> u16 {
    let mut crc: u16 = 0x${init.toString(16).toUpperCase()};

    for &mut b0 in data {
        let mut b = b0;
${def.reflectIn ? '        b = reflect8(b);\n' : ''}
        crc ^= (b as u16) << 8;

        for _ in 0..8 {
            if (crc & 0x8000) != 0 {
                crc = (crc << 1) ^ 0x${poly.toString(16).toUpperCase()};
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }

${def.reflectOut ? '    crc = reflect16(crc);\n' : ''}
    crc ^ 0x${def.xorOut.toString(16).toUpperCase()}
}
`.trim();
  }

  if (def.type === 'XOR') {
    const seed = resolve(def, state, 'xorSeed');

    return `
fn xor8(data: &[u8]) -> u8 {
    let mut x: u8 = 0x${seed.toString(16).toUpperCase()};
    for &b in data {
        x ^= b;
    }
    x
}
`.trim();
  }

  if (def.type === 'SUM') {
    return `
fn sum${def.width}(data: &[u8]) -> u16 {
    let mut s: u32 = 0;
    for &b in data {
        s += b as u32;
    }
    (s & 0x${def.width === 8 ? 'FF' : 'FFFF'}) as u16
}
`.trim();
  }
}

function emitCSharp(def, state) {

  if (def.type === 'CRC') {
    const poly = resolve(def, state, 'poly');
    const init = resolve(def, state, 'init');

    return `
static byte Reflect8(byte x)
{
    byte r = 0;
    for (int i = 0; i < 8; i++)
    {
        r = (byte)((r << 1) | (x & 1));
        x >>= 1;
    }
    return r;
}

static ushort Reflect16(ushort x)
{
    ushort r = 0;
    for (int i = 0; i < 16; i++)
    {
        r = (ushort)((r << 1) | (x & 1));
        x >>= 1;
    }
    return r;
}

static ushort Crc(byte[] data)
{
    ushort crc = 0x${init.toString(16).toUpperCase()};

    foreach (byte raw in data)
    {
        byte b = raw;
${def.reflectIn ? '        b = Reflect8(b);\n' : ''}
        crc ^= (ushort)(b << 8);

        for (int i = 0; i < 8; i++)
        {
            if ((crc & 0x8000) != 0)
                crc = (ushort)((crc << 1) ^ 0x${poly.toString(16).toUpperCase()});
            else
                crc <<= 1;
        }
    }
${def.reflectOut ? '    crc = Reflect16(crc);\n' : ''}
    return (ushort)(crc ^ 0x${def.xorOut.toString(16).toUpperCase()});
}
`.trim();
  }

  if (def.type === 'XOR') {
    const seed = resolve(def, state, 'xorSeed');

    return `
static byte Xor8(byte[] data)
{
    byte x = 0x${seed.toString(16).toUpperCase()};
    foreach (byte b in data) x ^= b;
    return x;
}
`.trim();
  }

  if (def.type === 'SUM') {
    return `
static ushort Sum${def.width}(byte[] data)
{
    uint s = 0;
    foreach (byte b in data) s += b;
    return (ushort)(s & 0x${def.width === 8 ? 'FF' : 'FFFF'});
}
`.trim();
  }
}
