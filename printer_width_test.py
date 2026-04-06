"""
Printer Character Width Diagnostic
Prints ruler lines at various widths to determine the exact chars_per_line.
Find the LONGEST ruler that fits on ONE line without wrapping.

Usage:
    python printer_width_test.py [PRINTER_IP]
    Default IP: 10.0.0.19 (kitchen printer)
"""
import socket
import sys

PRINTER_IP = sys.argv[1] if len(sys.argv) > 1 else "10.0.0.19"
PORT = 9100

ESC = b'\x1b'
GS  = b'\x1d'
LF  = b'\x0a'
INIT = ESC + b'\x40'
BOLD_ON  = ESC + b'\x45\x01'
BOLD_OFF = ESC + b'\x45\x00'
CENTER   = ESC + b'\x61\x01'
LEFT     = ESC + b'\x61\x00'
CUT      = GS + b'\x56\x00'
# ESC ! 0x00 = normal Font A, no bold, no double width/height
MODE_NORMAL = ESC + b'\x21\x00'

out = bytearray()
out += INIT
out += MODE_NORMAL
out += LEFT

out += CENTER + BOLD_ON
out += b'CHARACTER WIDTH TEST'
out += LF
out += BOLD_OFF + LEFT
out += LF

# Print rulers at various widths
for width in [20, 24, 28, 30, 32, 33, 34, 35, 36, 38, 40, 42, 44, 48]:
    # Label line
    label = f"--- {width} chars ---"
    out += label.encode('ascii')
    out += LF
    # Ensure normal mode before ruler
    out += MODE_NORMAL
    # Ruler: numbered characters repeating 1234567890
    ruler = ''.join(str((i + 1) % 10) for i in range(width))
    out += ruler.encode('ascii')
    out += LF
    out += LF

out += LF
out += CENTER + BOLD_ON
out += b'Find the LONGEST ruler'
out += LF
out += b'that fits on ONE line.'
out += LF
out += b'That is your chars_per_line.'
out += LF
out += BOLD_OFF + LEFT
out += LF * 3
out += CUT

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(5)
print(f"Connecting to {PRINTER_IP}:{PORT}...")
s.connect((PRINTER_IP, PORT))
s.sendall(bytes(out))
s.close()
print(f"Sent {len(out)} bytes — check the printout!")
