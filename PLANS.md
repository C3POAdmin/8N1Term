# Plans

This document outlines features and improvements I intend to work on next or in the medium term.
It is not a schedule or a commitment — priorities may change based on real-world use and feedback.

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

## Concept: Analysis Windows

Introduce **analysis windows** as optional, parallel tools that observe the live data stream without altering the core terminal UI.

Analysis windows are explicitly launched by the user and are clearly scoped as *tools*, not terminal modes.

### Recording Control

Each analysis window includes its own **Start / Stop Recording** controls:

- **Start** — begin observing and analysing incoming data
- **Stop** — freeze the current analysis state for inspection

Recording control is local to the analysis window; the primary terminal continues to receive and display data uninterrupted.

### Core Session Details

To maintain consistency and clarity, all analysis windows share a unified header showing:

- **Start Time** — timestamp when recording began
- **Duration** — elapsed recording time
- **Data Rate** — effective processing or observation speed
- **Recording State** — Start / Stop status

These details provide immediate context without overwhelming the interface.

### Design Principles

- Analysis windows are **read-only observers**
- No analysis window may pause, filter, or modify the terminal data stream
- Windows are optional, disposable, and may be opened or closed at any time
- The primary terminal surface remains byte-accurate and authoritative

This model allows protocol decoding, checksum analytics, and future tools to evolve independently while preserving the simplicity and integrity of the main terminal.

### Unify to an Analysis Button

Popup options so far:
- Data Plotter
- Modbus RTU Analysis
- Checksum / CRC Analysis

---

## Feedback

If you actively use any of the above features (or specific protocols / CRC variants),
feedback on **real-world use cases** is welcome. This helps prioritise what actually gets built.
