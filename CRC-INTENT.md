# CRC Button – Design & Implementation (8N1Term)

This document defines how the **CRC button** in 8N1Term works, what it supports, and what it intentionally ignores.

Goal:  
Provide **fast, correct CRC generation and verification** for **80% of real-world serial protocols**, especially IoT, embedded, and Chinese TTL devices — without turning the UI into a protocol textbook.

## Primary User Flow

1. User captures or types a data frame
2. User presses **CRC**
3. CRC is calculated over the selected data range
4. CRC bytes are appended to the frame

### Supported Standard CRC
| Name | Polynomial | Init | Ref In | Ref Out | XOR Out | Byte Order |
|----|----|----|----|----|----|----|
| **Modbus (Default)** | 0xA001 | 0xFFFF | Yes | Yes | 0x0000 | LSB → MSB |
| CRC-16-IBM | 0x8005 | 0x0000 | Yes | Yes | 0x0000 | LSB → MSB |
| CRC-16-CCITT | 0x1021 | 0xFFFF | No | No | 0x0000 | MSB → LSB |
| CRC-16-X25 | 0x1021 | 0xFFFF | Yes | Yes | 0xFFFF | LSB → MSB |

### Custom Fields

- Polynomial (hex)
- Init value (hex)
- Byte order: **LSB → MSB**

### Support others
XOR (8-bit)
SUM (8-bit)
XOR Initial value 0x00 / 0xFF
