# CRC Button – Design & Implementation (8N1Term)

This document defines how the **CRC button** in 8N1Term works, what it supports, and what it intentionally ignores.

Goal:  
Provide **fast, correct CRC generation and verification** for **80% of real-world serial protocols**, especially IoT, embedded, and Chinese TTL devices — without turning the UI into a protocol textbook.

---

## Core Philosophy

- Default to **what the world actually uses**
- Make **common CRCs one click**
- Allow **minimal customization** where vendors are sloppy
- Avoid exotic CRC variants unless they are trivial to add

CRC is a **tool**, not a religion.

---

## Primary User Flow

1. User captures or types a data frame
2. User presses **CRC**
3. CRC is calculated over the selected data range
4. CRC bytes are:
   - appended to the frame **or**
   - verified against existing trailing bytes
5. Result is shown instantly (pass/fail + computed value)

---

## CRC Width Selector

### Supported Widths (Button / Toggle)

- **8-bit**
- **16-bit** ✅ (default)
- **32-bit**
- **64-bit** *(optional, hidden unless enabled)*

Reality check:
- **16-bit covers most serial protocols**
- 8-bit shows up in legacy sensors
- 32-bit is common in Ethernet / files
- 64-bit is rare on serial — keep it optional

---

## Preset CRC Formats (80% Coverage)

### CRC-16 Presets (Most Important)

| Name | Polynomial | Init | Ref In | Ref Out | XOR Out | Byte Order |
|----|----|----|----|----|----|----|
| **Modbus (Default)** | 0xA001 | 0xFFFF | Yes | Yes | 0x0000 | LSB → MSB |
| CRC-16-IBM | 0x8005 | 0x0000 | Yes | Yes | 0x0000 | LSB → MSB |
| CRC-16-CCITT | 0x1021 | 0xFFFF | No | No | 0x0000 | MSB → LSB |
| CRC-16-X25 | 0x1021 | 0xFFFF | Yes | Yes | 0xFFFF | LSB → MSB |

**Default selection:**  
➡ **CRC-16 Modbus**

Reason:
- Dominates Chinese TTL, RS-485, laser modules, industrial sensors
- Almost always reused across product families

---

### CRC-8 Presets

- CRC-8 (0x07)
- CRC-8 Dallas/Maxim (0x31)

Minimal UI — most users won’t need more.

---

### CRC-32 Presets

- CRC-32 (Ethernet / ZIP)
- CRC-32C (Castagnoli)

Mostly for file or packet analysis, not raw serial.

---

## Data Range Selection (Critical)

CRC is often **not calculated over the entire frame**.

### Range Options

- **Entire buffer**
- **From index N**
- **Length M**
- **Exclude last X bytes** (default = 2 for CRC-16)

This covers:
- header-excluded CRCs
- length-byte-excluded CRCs
- vendor quirks

No need for per-byte include toggles — overkill.

---

## Byte Order Handling

CRC output byte order is **not negotiable**.

### Toggle

- **LSB first** (default for Modbus)
- **MSB first**

Many users get CRC “wrong” only because of byte order.

Make this explicit.

---

## Append vs Verify Mode

### Modes

- **Append CRC**
  - Calculates CRC
  - Appends bytes to outgoing frame
- **Verify CRC**
  - Assumes CRC already present
  - Computes and compares
  - Displays:
    - ✅ Match
    - ❌ Mismatch
    - Expected vs received

Auto-detect when possible, but **manual override wins**.

---

## Custom CRC Mode (Minimal, Not Scary)

For vendor-specific weirdness.

### Custom Fields (Shown Only in Custom Mode)

- Polynomial (hex)
- Init value (hex)
- XOR out (hex)
- Reflect input (on/off)
- Reflect output (on/off)

No lookup tables exposed.
No math explanations.
Advanced users already know what these mean.

---

## Start Byte / Header Skipping

### Optional Simple Control

- **Skip first N bytes**

This replaces:
- “Start byte”
- “Address byte”
- “Frame type byte”

Do **not** label it protocol-specific.
Just call it what it is.

---

## What We Explicitly Ignore (On Purpose)

- Bit-level CRC visualizers
- Polynomial math walkthroughs
- Named telecom CRC variants nobody uses
- Automatic protocol inference
- CRC chaining across frames

If someone needs those, they’re not the target user.

---

## Defaults (Very Important)

On first run:

- CRC Width: **16-bit**
- Preset: **Modbus**
- Range: **Exclude last 2 bytes**
- Byte order: **LSB → MSB**
- Mode: **Verify if data ends with 2 bytes, else Append**

This matches **real devices out of the box**.

---

## Why This Covers 80%+

Because:
- Most serial devices are lazy
- Vendors reuse firmware
- Modbus CRC is everywhere
- Errors are usually range or byte-order, not math

8N1Term should help users **see that instantly**, not fight it.

---

## Future (Optional, Not Required)

- Live CRC preview as bytes arrive
- Highlight CRC bytes in hex view
- Remember last CRC config per device

Only add if it doesn’t clutter the UI.

---

**CRC in 8N1Term is a productivity tool.  
Not a standards museum.**
