"""
KINDpos Hardware API
Network scanning, device persistence (hardware_config.db), test print.
MAC-as-identity: IPs change, MACs don't.
"""

import asyncio
import os
import socket
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional

import aiosqlite
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/hardware", tags=["hardware"])

# ── DB path ───────────────────────────────────────────────────────────────────
HARDWARE_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))))),
    'hardware_config.db'
)

# ── Port fingerprinting ───────────────────────────────────────────────────────
# Standard ESC/POS raw socket ports
PRINTER_PORTS     = [9100, 9101, 9102]
# LPD, IPP, HTTP management (some Epson models expose HTTP)
PRINTER_PORTS_EXT = [515, 631, 80]
# Dejavoo SPIN and common card reader ports
CARD_READER_PORTS = [8443, 9443, 443, 8080, 10009, 4443, 9000]

ALL_SCAN_PORTS    = PRINTER_PORTS + PRINTER_PORTS_EXT + CARD_READER_PORTS

# ── DB bootstrap ──────────────────────────────────────────────────────────────

async def _ensure_db():
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                mac         TEXT PRIMARY KEY,
                ip          TEXT NOT NULL,
                type        TEXT NOT NULL,
                name        TEXT NOT NULL,
                port        INTEGER NOT NULL DEFAULT 9100,
                register_id TEXT NOT NULL DEFAULT '',
                tpn         TEXT NOT NULL DEFAULT '',
                auth_key    TEXT NOT NULL DEFAULT '',
                saved_at    TEXT NOT NULL
            )
        """)
        # Migrate: add columns if missing (existing DBs)
        async with db.execute("PRAGMA table_info(devices)") as cur:
            cols = [row[1] async for row in cur]
        if 'register_id' not in cols:
            await db.execute("ALTER TABLE devices ADD COLUMN register_id TEXT NOT NULL DEFAULT ''")
        if 'tpn' not in cols:
            await db.execute("ALTER TABLE devices ADD COLUMN tpn TEXT NOT NULL DEFAULT ''")
        if 'auth_key' not in cols:
            await db.execute("ALTER TABLE devices ADD COLUMN auth_key TEXT NOT NULL DEFAULT ''")
        if 'categories' not in cols:
            await db.execute("ALTER TABLE devices ADD COLUMN categories TEXT NOT NULL DEFAULT ''")
        await db.commit()

# ── Models ────────────────────────────────────────────────────────────────────

class DeviceRecord(BaseModel):
    mac:  str
    ip:   str
    type: str        # 'kitchen' | 'receipt' | 'card_reader'
    name: str
    port: int = 9100
    register_id: str = ''  # SPIn Register ID for card readers
    tpn: str = ''          # SPIn Terminal Processing Number
    auth_key: str = ''     # SPIn Auth Key for card readers
    categories: str = ''   # Comma-separated category IDs for kitchen printers

class TestRequest(BaseModel):
    mac: str

class TestPrintRequest(BaseModel):
    ip:   str
    port: int = 9100

# ═══════════════════════════════════════════════════════════════════════════════
#  SCAN
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/scan")
async def scan_network(ip: Optional[str] = None):
    """
    Scan for devices on known ESC/POS and card-reader ports.
    ?ip=10.0.0.19  → probe that specific address only
    (no param)     → sweep default subnet
    """
    await _ensure_db()

    if ip:
        targets = [ip]
    else:
        subnet = '10.0.0'
        if '/' in subnet:
            subnet = subnet.split('/')[0].rsplit('.', 1)[0]
        targets = [f"{subnet}.{i}" for i in range(1, 255)]

    found = await asyncio.gather(*[_probe_host(h) for h in targets])
    results = [r for r in found if r is not None]

    # Annotate with saved info where MACs match
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM devices") as cur:
            saved = {row['mac']: dict(row) async for row in cur}

    for r in results:
        if r['mac'] in saved:
            r['saved_name'] = saved[r['mac']]['name']
            r['saved_type'] = saved[r['mac']]['type']

    return results


@router.get("/scan/stream")
async def scan_network_stream(ip: Optional[str] = None):
    """
    Same as /scan but streams devices as they are found via Server-Sent Events.
    Each discovered device fires immediately — no waiting for full sweep.

    SSE event types:
        start    — scan started, includes target count
        device   — a device was found (same shape as /scan results)
        complete — sweep finished
        error    — something went wrong
    """
    await _ensure_db()

    if ip:
        targets = [ip]
    else:
        subnet = '10.0.0'
        if '/' in subnet:
            subnet = subnet.split('/')[0].rsplit('.', 1)[0]
        targets = [f"{subnet}.{i}" for i in range(1, 255)]

    # Load saved devices for annotation
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM devices") as cur:
            saved = {row['mac']: dict(row) async for row in cur}

    async def stream():
        import json

        yield f"data: {json.dumps({'type': 'start', 'total': len(targets)})}\n\n"

        # Probe in batches of 20 — enough concurrency without hammering the LAN
        BATCH = 20
        for i in range(0, len(targets), BATCH):
            batch = targets[i:i + BATCH]
            results = await asyncio.gather(*[_probe_host(h) for h in batch])
            for r in results:
                if r is not None:
                    if r['mac'] in saved:
                        r['saved_name'] = saved[r['mac']]['name']
                        r['saved_type'] = saved[r['mac']]['type']
                    yield f"data: {json.dumps({**r, 'type': 'device'})}\n\n"

        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    from fastapi.responses import StreamingResponse as SR
    return SR(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _probe_host(host: str):
    """Probe a host on all known ports. Returns device dict or None."""
    loop = asyncio.get_running_loop()
    for port in ALL_SCAN_PORTS:
        try:
            hit = await asyncio.wait_for(
                loop.run_in_executor(None, _tcp_probe, host, port),
                timeout=1.0
            )
            if hit:
                mac   = _get_mac(host)
                dtype = 'printer' if port in PRINTER_PORTS + PRINTER_PORTS_EXT else 'card_reader'
                result = {
                    'ip':   host,
                    'port': port,
                    'mac':  mac or f"UNKNOWN-{host.replace('.', '-')}",
                    'type': dtype,
                    'name': 'Thermal Printer' if dtype == 'printer' else 'Card Reader',
                }
                # Auto-detect SPIn details for card readers
                if dtype == 'card_reader':
                    spin = await _probe_spin(host, port)
                    if spin.get('register_id'):
                        result['register_id'] = spin['register_id']
                    if spin.get('model'):
                        result['name'] = spin['model']
                    elif spin.get('status'):
                        result['name'] = 'Dejavoo'
                return result
        except (asyncio.TimeoutError, Exception):
            continue
    return None


def _tcp_probe(host: str, port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.8)
            s.connect((host, port))
            return True
    except Exception:
        return False


def _get_mac(ip: str) -> Optional[str]:
    """Best-effort MAC from ARP cache — works on LAN without root."""
    import subprocess
    for cmd in (['arp', '-a', ip], ['arp', '-n', ip]):
        try:
            out = subprocess.check_output(cmd, timeout=2,
                                          stderr=subprocess.DEVNULL).decode()
            for line in out.splitlines():
                if ip in line:
                    for part in line.split():
                        if len(part) == 17 and (':' in part or '-' in part):
                            return part.replace('-', ':').upper()
        except Exception:
            continue
    return None


async def _probe_spin(ip: str, port: int) -> dict:
    """Probe a Dejavoo device via SPIn GET to auto-detect RegisterId and serial."""
    xml = "<request><function>GetStatus</function><RegisterId></RegisterId></request>"
    encoded = urllib.parse.quote(xml, safe='')
    url = f"http://{ip}:{port}/spin/cgi.html?TerminalTransaction={encoded}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.text.strip():
                body = resp.text.strip()
                if body.startswith("<xmp>"): body = body[5:]
                if body.endswith("</xmp>"): body = body[:-6]
                body = urllib.parse.unquote(body.strip())
                root = ET.fromstring(body)
                return {
                    "register_id": root.findtext("RegisterId") or root.findtext("TerminalId") or "",
                    "serial":      root.findtext("SN") or root.findtext("SerialNo") or "",
                    "model":       root.findtext("Model") or "",
                    "status":      root.findtext("RespMSG") or root.findtext("Message") or "",
                }
    except Exception:
        pass
    return {}


# ═══════════════════════════════════════════════════════════════════════════════
#  DEVICE CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/devices")
async def list_devices():
    """Return all saved devices from hardware_config.db."""
    await _ensure_db()
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM devices ORDER BY saved_at") as cur:
            return [dict(row) async for row in cur]


@router.post("/devices")
async def save_device(device: DeviceRecord):
    """Insert or update a device by MAC address."""
    await _ensure_db()
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        await db.execute("""
            INSERT INTO devices (mac, ip, type, name, port, register_id, tpn, auth_key, categories, saved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(mac) DO UPDATE SET
                ip          = excluded.ip,
                type        = excluded.type,
                name        = excluded.name,
                port        = excluded.port,
                register_id = excluded.register_id,
                tpn         = excluded.tpn,
                auth_key    = excluded.auth_key,
                categories  = excluded.categories,
                saved_at    = excluded.saved_at
        """, (device.mac.upper(), device.ip, device.type,
              device.name, device.port, device.register_id, device.tpn, device.auth_key,
              device.categories, now))
        await db.commit()
    return {**device.dict(), 'mac': device.mac.upper(), 'saved_at': now}


@router.delete("/devices/{mac}")
async def delete_device(mac: str):
    """Remove a saved device by MAC."""
    await _ensure_db()
    mac = mac.upper()
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        await db.execute("DELETE FROM devices WHERE mac = ?", (mac,))
        await db.commit()
    return {"deleted": mac}

@router.get("/kitchen-printers")
async def list_kitchen_printers():
    """Return kitchen printers with their assigned categories."""
    await _ensure_db()
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM devices WHERE type = 'kitchen' ORDER BY saved_at"
        ) as cur:
            printers = []
            async for row in cur:
                d = dict(row)
                cats = d.get('categories', '')
                d['categories_list'] = [c.strip() for c in cats.split(',') if c.strip()] if cats else []
                printers.append(d)
            return printers


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST (by MAC — resolves IP from DB)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/test")
async def test_device(req: TestRequest):
    """Test connectivity to a saved device by MAC address."""
    await _ensure_db()
    mac = req.mac.upper()
    async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM devices WHERE mac = ?", (mac,)
        ) as cur:
            row = await cur.fetchone()

    if not row:
        return {"success": False, "message": f"Device {mac} not saved"}

    dev = dict(row)
    reachable = await asyncio.get_running_loop().run_in_executor(
        None, _tcp_probe, dev['ip'], dev['port']
    )
    return {
        "success": reachable,
        "mac": mac,
        "ip": dev['ip'],
        "port": dev['port'],
        "message": "Device reachable" if reachable
                   else f"Cannot connect to {dev['ip']}:{dev['port']}",
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  TEST PRINT (direct IP — used from settings scene device editor)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/test-print")
async def test_print(request: TestPrintRequest):
    """Send a KINDpos test receipt via raw ESC/POS over TCP."""
    ESC = b'\x1b'; GS = b'\x1d'
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    receipt = bytearray()
    receipt += ESC + b'\x40'                  # init
    receipt += ESC + b'\x61\x01'              # center
    receipt += b'================================\n'
    receipt += ESC + b'\x21\x20' + ESC + b'\x45\x01'
    receipt += b'K I N D p o s\n'
    receipt += ESC + b'\x21\x00' + ESC + b'\x45\x00'
    receipt += b'Nice. Dependable. Yours.\n'
    receipt += b'================================\n\n'
    receipt += ESC + b'\x45\x01' + ESC + b'\x21\x20'
    receipt += b'*** TEST PRINT ***\n'
    receipt += ESC + b'\x21\x00' + ESC + b'\x45\x00' + b'\n'
    receipt += ESC + b'\x61\x00'              # left
    receipt += f'  IP:   {request.ip}\n'.encode()
    receipt += f'  Port: {request.port}\n'.encode()
    receipt += f'  Date: {now}\n'.encode()
    receipt += b'\n' + ESC + b'\x61\x01'
    receipt += b'If you can read this,\nyour printer is ready.\n\n'
    receipt += b'================================\n'
    receipt += ESC + b'\x45\x01' + b'KIND Technologies\n' + ESC + b'\x45\x00'
    receipt += b'================================\n'
    receipt += ESC + b'\x64\x03'              # feed
    receipt += GS  + b'\x56\x00'              # cut

    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, _send_raw, request.ip, request.port, bytes(receipt)
        )
        return {"success": True,
                "message": f"Test print sent to {request.ip}:{request.port}",
                "timestamp": now}
    except socket.timeout:
        return {"success": False,
                "message": f"Timed out — {request.ip}:{request.port} not responding"}
    except ConnectionRefusedError:
        return {"success": False,
                "message": f"Refused — {request.ip}:{request.port}"}
    except Exception as e:
        return {"success": False, "message": f"Print failed: {e}"}


def _send_raw(ip: str, port: int, data: bytes):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(5.0)
        s.connect((ip, port))
        s.sendall(data)


@router.get("/status")
async def hardware_status():
    return {
        "status": "online",
        "db_path": HARDWARE_DB_PATH,
        "default_subnet": "10.0.0",
        "endpoints": [
            "/api/v1/hardware/scan",
            "/api/v1/hardware/devices",
            "/api/v1/hardware/test",
            "/api/v1/hardware/test-print",
            "/api/v1/hardware/test-connection",
            "/api/v1/hardware/status",
        ],
    }


class TestConnectionRequest(BaseModel):
    ip: str
    port: int
    timeout: float = 2.0


@router.post("/test-connection")
async def test_connection(req: TestConnectionRequest):
    """Test raw TCP connectivity to an IP:port."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(req.timeout)
        s.connect((req.ip, req.port))
        s.close()
        status = "online"
    except (socket.timeout, ConnectionRefusedError, OSError):
        status = "unreachable"
    return {"ip": req.ip, "port": req.port, "status": status}