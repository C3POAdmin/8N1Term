export const CHECKSUM_DEFS = [

  // ===== CRC-8 =====
  {
    type: "CRC",
    name: "CRC-8",
    width: 8,
    poly: 0x07,
    init: 0x00,
    xorOut: 0x00,
    reflectIn: false,
    reflectOut: false,
  },
  {
    type: "CRC",
    name: "CRC-8-MAXIM",
    width: 8,
    poly: 0x31,
    init: 0x00,
    xorOut: 0x00,
    reflectIn: true,
    reflectOut: true,
  },

  // ===== CRC-16 =====
  {
    type: "CRC",
    name: "CRC-16-MODBUS",
    width: 16,
    poly: 0x8005,
    init: 0xFFFF,
    xorOut: 0x0000,
    reflectIn: true,
    reflectOut: true,
  },
  {
    type: "CRC",
    name: "CRC-16-IBM",
    width: 16,
    poly: 0x8005,
    init: 0x0000,
    xorOut: 0x0000,
    reflectIn: true,
    reflectOut: true,
  },
  {
    type: "CRC",
    name: "CRC-16-CCITT",
    width: 16,
    poly: 0x1021,
    init: 0xFFFF,
    xorOut: 0x0000,
    reflectIn: false,
    reflectOut: false,
  },
  {
    type: "CRC",
    name: "CRC-16-X25",
    width: 16,
    poly: 0x1021,
    init: 0xFFFF,
    xorOut: 0xFFFF,
    reflectIn: true,
    reflectOut: true,
  },

  // ===== XOR =====
  {
    type: "XOR",
    name: "XOR-8",
    width: 8,
    xorSeed: 0x00,   // only allowed values: 0x00 or 0xFF
    poly: null,
    init: null,
  },

  // ===== SUM =====
  {
    type: "SUM",
    name: "SUM-8",
    width: 8,
    poly: null,
    init: null,
  },
  {
    type: "SUM",
    name: "SUM-16",
    width: 16,
    poly: null,
    init: null,
  },
];
