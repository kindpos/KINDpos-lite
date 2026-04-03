"""
Printer Size Command Diagnostic
Tests multiple ESC/POS size methods to see which ones this printer supports.
"""
import socket
import sys

PRINTER_IP = "10.0.0.19"
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

def send(data: bytes):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    s.connect((PRINTER_IP, PORT))
    s.sendall(data)
    s.close()
    print(f"Sent {len(data)} bytes")

out = bytearray()
out += INIT

out += CENTER
out += BOLD_ON
out += b'=== SIZE DIAGNOSTIC ==='
out += LF + LF
out += BOLD_OFF
out += LEFT

# ── Test 1: GS ! (standard character size select) ─────────────────
out += b'Test 1: GS ! 0x11 (2x2)'
out += LF
out += GS + b'\x21\x11'   # GS ! — double width + double height
out += b'HELLO 2x2'
out += LF
out += GS + b'\x21\x00'   # reset
out += LF

# ── Test 2: GS ! width only ───────────────────────────────────────
out += b'Test 2: GS ! 0x10 (2x wide)'
out += LF
out += GS + b'\x21\x10'
out += b'HELLO 2xW'
out += LF
out += GS + b'\x21\x00'
out += LF

# ── Test 3: GS ! height only ──────────────────────────────────────
out += b'Test 3: GS ! 0x01 (2x tall)'
out += LF
out += GS + b'\x21\x01'
out += b'HELLO 2xH'
out += LF
out += GS + b'\x21\x00'
out += LF

# ── Test 4: ESC ! (print mode select) ─────────────────────────────
out += b'Test 4: ESC ! 0x30 (dbl W+H)'
out += LF
out += ESC + b'\x21\x30'  # ESC ! — bits 4+5 = double height + double width
out += b'HELLO ESC!'
out += LF
out += ESC + b'\x21\x00'  # reset
out += LF

# ── Test 5: ESC ! with bold ───────────────────────────────────────
out += b'Test 5: ESC ! 0x38 (dbl W+H+bold)'
out += LF
out += ESC + b'\x21\x38'  # bits 3+4+5 = bold + double height + double width
out += b'HELLO BOLD'
out += LF
out += ESC + b'\x21\x00'
out += LF

# ── Test 6: ESC SO (double-width per line, legacy) ────────────────
out += b'Test 6: ESC SO (shift-out dbl width)'
out += LF
out += b'\x0e'            # SO — double width for this line only
out += b'HELLO SO'
out += LF                 # SO auto-cancels on LF
out += LF

# ── Test 7: ESC SO + GS ! height ──────────────────────────────────
out += b'Test 7: SO + GS ! height'
out += LF
out += b'\x0e'            # SO — double width
out += GS + b'\x21\x01'   # GS ! — double height
out += b'HELLO COMBO'
out += LF
out += GS + b'\x21\x00'
out += LF

# ── Test 8: Normal reference ──────────────────────────────────────
out += b'Test 8: Normal (reference)'
out += LF
out += b'HELLO NORMAL'
out += LF + LF

# ── Divider + cut ─────────────────────────────────────────────────
out += b'-' * 48
out += LF
out += CENTER
out += b'Which tests printed BIG?'
out += LF
out += LEFT
out += LF * 3
out += CUT

send(bytes(out))
print("Check the printout — note which HELLO lines are larger than Test 8")