# Plans

This document outlines features and improvements I intend to work on next or in the medium term.
It is not a schedule or a commitment — priorities may change based on real-world use and feedback.


---

## TX History

Button clickable, auto loads into the TX buffer, makes resend (and send) button more effective.

---

## State memory

A JSON file, easily editable, remembers TX history, Checksum and custom Checksum state.

---

## Data Plotter (additional features)

Add 10k reading buffer
Work out best case number of points per screen
Add prev next button, or fake/linked scrollbar

---

## Protocol-aware helpers (e.g. Modbus RTU)

Explore **protocol-aware helpers** that *annotate* raw serial data without altering or replacing the core hex / ASCII terminal view.

Initial focus: **Modbus RTU**.

- The primary terminal surface remains **byte-accurate and authoritative**
- When enabled, frames that parse cleanly as Modbus RTU are indicated by a **subtle visual marker** (e.g. a faint blue line beneath the packet)
- Hover or click provides **protocol-level annotation** (address, function code name, fields, CRC validity), without implying device semantics or behaviour

For deeper inspection, allow opening a **separate analysis window** (similar to the data plotter):

- Displays Modbus packets alongside their protocol-defined field meanings
- Clearly scoped as an **analysis tool**, not a terminal mode
- Optional, parallel, and fully disposable

The terminal itself never switches modes, hides bytes, or assumes project context — protocol helpers are **assistive overlays**, not transformations.

---

## Feedback

If you actively use any of the above features (or specific protocols / CRC variants),
feedback on **real-world use cases** is welcome. This helps prioritise what actually gets built.
