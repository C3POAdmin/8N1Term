# Plans

This document outlines features and improvements I intend to work on next or in the medium term.
It is not a schedule or a commitment — priorities may change based on real-world use and feedback.

---

## Data Plotter

Add 10k reading buffer
Work out best case number of points per screen
Add prev next button, or fake/linked scrollbar

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

## Feedback

If you actively use any of the above features (or specific protocols / CRC variants),
feedback on **real-world use cases** is welcome. This helps prioritise what actually gets built.
