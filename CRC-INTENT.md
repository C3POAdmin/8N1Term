# CRC Button – Design & Implementation (8N1Term)

This document defines how the **CRC button** in 8N1Term works, what it supports, and what it intentionally ignores.

Goal:  
Provide **fast, correct CRC generation and verification** for **80% of real-world serial protocols**, especially IoT, embedded, and Chinese TTL devices — without turning the UI into a protocol textbook.

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

Reality check:
- **16-bit covers most serial protocols**
- 8-bit shows up in legacy sensors
- 32-bit is common in Ethernet / files

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

## Byte Order Handling

CRC output byte order is **not negotiable**.

### Toggle

- **LSB first** (default for Modbus)
- **MSB first**

Many users get CRC “wrong” only because of byte order.

Make this explicit.

---

### Custom Fields (Maybe - Thinking about it)

- Polynomial (hex)
- Init value (hex)
- XOR out (hex)
- Reflect input (on/off)
- Reflect output (on/off)

No lookup tables exposed.
No math explanations.
Advanced users already know what these mean.

---

## Defaults

On first run:

- CRC Width: **16-bit**
- Preset: **Modbus**
- Byte order: **LSB → MSB**

---

## Future

- RX CRC bytes are visually distinguished (slightly different blue hue) for identification only

