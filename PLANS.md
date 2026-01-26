# Plans

This document outlines features and improvements I intend to work on next or in the medium term.
It is not a schedule or a commitment — priorities may change based on real-world use and feedback.

---

## Additional Plotting style for long term data recording

### Time-Based — Long-term value sampling (Proposed)
*(Sparse, event-driven measurements over real time)*
Value
│
│        │
│        │
│   │    │
│   │    │
│   │    │
└───┼────┼────────────── Time
    t1   t2            t3


### Value-Based — Quick per-value sampling (Completed)
*(Continuous or high-frequency measurements)*

Value
│        ●───●───●───●
│      ●
│    ●
│  ●
└──────────────────── Time

---


## Protocol-aware helpers (e.g. MODBUS)

Explore adding **protocol-aware helpers** for common industrial / embedded protocols, starting with MODBUS-style framing.

This is intended as *assistance*, not a full protocol analyzer.

### Possible scope
- Frame boundary awareness
- Basic decode helpers for well-known fields
- Optional human-readable annotations alongside raw data

### Initial protocol candidates
- MODBUS RTU
- MODBUS ASCII
- (Others based on real demand)

### Design constraints
- No hard dependency on protocol mode
- Raw bytes must always remain visible
- Prefer **modular / helper-style** implementation rather than hard-coded logic

### Requirements before implementation
- Clear demand for specific protocols
- Agreement on minimal decode depth (avoid scope creep)
- Defined behaviour when frames are malformed or partial

---

## CRC calculation helper

Add a **CRC helper button** to assist with constructing outbound frames.

### Intended behaviour
- User selects a CRC type
- CRC is calculated over the current TX buffer
- Result is automatically **inserted into the transmit buffer**
- Supports both hex and binary contexts

### Initial CRC types to support
- CRC-8
- CRC-16 (IBM / MODBUS)
- CRC-16-CCITT
- CRC-32 (common variants)

### Design constraints
- Explicit user action (no hidden auto-modification)
- Clear visibility of:
  - polynomial
  - initial value
  - endianness
- Must work cleanly with binary TX buffers

### Open questions
- UI placement (toolbar vs TX panel)
- Append vs insert-at-cursor behaviour
- Preset vs fully configurable CRC parameters

---

## Feedback

If you actively use any of the above features (or specific protocols / CRC variants),
feedback on **real-world use cases** is welcome. This helps prioritise what actually gets built.
