# KINDpos/lite

**Nice. Dependable. Yours.**

A touch-optimized point-of-sale terminal for independent restaurants. This is the lite (demo) edition — full functionality with stubbed hardware integrations so you can explore the system without physical peripherals.

## What's Included

- **Seat Management** — dine-in, to-go, bar tab, delivery, and staff meal order types
- **Server Checkout & Tip-Out** — configurable tip-out rules by role, automatic calculations, manager overrides
- **Entomology** — tamper-evident diagnostic system with SHA-256 hash chains and adaptive heartbeat monitoring
- **Event-Sourced Ledger** — append-only SQLite ledger with hash-chained integrity and 2-decimal-place monetary precision
- **Reporting** — sales summaries, labor reports, and category breakdowns with chart visualizations

## Demo Mode

Hardware integrations are fully stubbed for demo use:

| System | Demo Behavior |
|--------|--------------|
| **Payments** | MockPaymentDevice approves all card transactions (configurable: decline, timeout, cancel) |
| **Printing** | MockThermalPrinter logs output to console — no TCP socket calls |
| **Scanner** | Network scan UI functional, discovers devices on local subnet |

## Quick Start

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Start the server (serves both API and frontend)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Open in browser (optimized for 1024x600 touch displays)
# http://localhost:8000
```

## Running Tests

```bash
pytest backend/tests -q
```

## Tech Stack

- **Frontend:** Vanilla JavaScript, custom scene manager, ES modules
- **Backend:** FastAPI + SQLite (async via aiosqlite)
- **Design System:** Style D — beveled buttons, chamfered corners, dark terminal aesthetic

## Project Structure

```
frontend/          Touch-optimized terminal UI
  js/scenes/       Scene modules (login, order-entry, payment, etc.)
  js/tokens.js     Design tokens — single source of truth for all visual values
  js/scene-manager.js  Scene lifecycle, caching, prefetch, touch debounce
backend/
  app/core/        Event ledger, events, projections, money utilities
  app/api/routes/  REST API endpoints
  app/printing/    Print queue, dispatcher, ESC/POS templates
  app/services/    Diagnostic collector, demo seeder
  tests/           517 tests covering all subsystems
kindnostic/        Boot diagnostic runner and probes
```
