# KINDpos-lite — Configurable Components

All user-adjustable settings broken down by category.

---

## 1. Store Information

| Component | Description |
|-----------|-------------|
| Restaurant Name | Business name displayed on receipts/UI |
| Legal Entity Name | Official business entity name |
| Address (Line 1 & 2) | Street address fields |
| City / State / ZIP | Location details |
| Phone / Email / Website | Contact information |
| Receipt Header Text | Custom text at top of receipts |
| Receipt Footer Text | Custom text at bottom of receipts |

**API:** `GET/POST /api/v1/config/store/info`

---

## 2. Tax & Pricing

| Component | Description |
|-----------|-------------|
| Tax Rate | Default tax percentage (default: 7%) |
| Tax Rules | Multiple rules with per-category support |
| Cash Discount Rate | Dual-pricing discount for cash payments (default: 4%) |
| Rounding Mode | Standard, round up, or round down |
| Currency | USD, CAD, EUR |
| CC Processing Rate | Credit card processing percentage (default: 2.9%) |
| Per-Transaction Fee | Fixed fee per card transaction (default: $0.30) |

**API:** `GET /api/v1/config/pricing`, `POST /api/v1/config/store/cc-rate`

---

## 3. Menu Configuration

| Component | Description |
|-----------|-------------|
| Menu Categories | Name, display order, hex color, tax rule, placement/half-placement flags |
| Menu Items | Name, price, description, kitchen name, category, tax rule, revenue category (Food/Beverage/Alcohol), prep time, print station, allergens, active status |
| Item 86 / Restore | Mark items as unavailable or restore them |
| Modifier Groups | Groups of modifiers (e.g., toppings, crust options) with per-size pricing |

**API:** `GET /api/v1/config/menu/categories`, `GET /api/v1/config/menu/items`, `POST /api/v1/config/menu/86`, `POST /api/v1/config/menu/restore`

---

## 4. Employee & Role Management

| Component | Description |
|-----------|-------------|
| Employees | First/last/display name, PIN, hourly rate, role assignments, permissions override, active status |
| Roles | Name, permission level (Standard/Elevated/Manager), granular permissions dict, tipout eligibility flags |
| Manager PIN | PIN for manager-level overrides |
| Session Timeout | Auto-lock timeout in minutes |
| Tipout Rules | Role-to-role tip distribution (percentage, calculation base: Net Sales/Gross Tips/Net Tips) |

**API:** `GET/POST /api/v1/config/employees`, `GET/POST/PUT/DELETE /api/v1/config/roles`, `GET /api/v1/config/tipout`

---

## 5. Floor Plan & Sections

| Component | Description |
|-----------|-------------|
| Sections | Name, color, active status |
| Tables | Name, seat count, section assignment, shape, position (x/y), dimensions, rotation |
| Structures | Walls, barriers, and other layout elements |
| Fixtures | Device placements (e.g., POS terminal locations) |
| Canvas | Overall floor plan dimensions (width/height) |

**API:** `GET /api/v1/config/floorplan/sections`, `GET /api/v1/config/floorplan`

---

## 6. Order & Service Settings

| Component | Description |
|-----------|-------------|
| Order Types | Enable/disable dine-in, takeout, delivery, etc. |
| Operating Hours | Per-day open/close times with enable/disable toggle |
| Auto-Gratuity | Enable/disable, party size threshold (default: 6), tip rate (default: 20%), applicable order types |

**API:** `GET /api/v1/config/store`

---

## 7. Hardware — Printers

| Component | Description |
|-----------|-------------|
| Printer Name / Nickname | Friendly device name |
| Station Type | hot_line, cold_line, bar, dessert, expo, receipt, delivery, general |
| IP Address / MAC Address | Network identification |
| Paper Width | 80mm or 58mm |
| Print Logo | Toggle logo on receipts |
| Category Routing | Map menu categories to specific kitchen printers (routing matrix) |
| Active Status | Enable/disable individual printers |

**API:** `GET/POST /api/v1/hardware/devices`, `DELETE /api/v1/hardware/devices/{mac}`

---

## 8. Hardware — Card Readers

| Component | Description |
|-----------|-------------|
| Device Name | Friendly reader name |
| Device Type | dejavoo_spin, mock |
| IP Address / Port | Network settings (default port: 9000) |
| Register ID | Dejavoo SPIn register identifier |
| Terminal Processing Number (TPN) | Processor terminal ID |
| Auth Key | Authentication key (not used for LAN SPIn) |

**API:** `GET/POST /api/v1/hardware/devices`, `POST /api/v1/payments/reload-devices`

---

## 9. Hardware — Network Discovery

| Component | Description |
|-----------|-------------|
| Default Subnet | Subnet for ARP-based device scanning (default: 10.0.0.0/24) |
| Scan Timeout | Timeout for hardware discovery (default: 2.5s) |
| Direct IP Scan | Probe specific IPs (comma-separated) |
| Network Scan | ARP-first discovery: broadcast ping, read ARP table, TCP probe live hosts |

**API:** `GET /api/v1/hardware/scan/stream`, `GET /api/v1/hardware/scan/stream?ip=10.0.0.19,10.0.0.124`

---

## 10. Terminal Settings

| Component | Description |
|-----------|-------------|
| Terminal ID / Name | Unique identifier and display name |
| Terminal Role | Function of this terminal |
| Default Section | Section assigned to this terminal |
| Training Mode | Toggle training/demo mode |
| Display Brightness | Screen brightness control |
| Resolution | 1024x600 or 800x480 |
| Orientation | Landscape or Portrait |
| Hostname | Network hostname |
| WiFi SSID / Static IP | Network connection settings |

**API:** `GET /api/v1/config/terminals`

---

## 11. Printing & Receipts

| Component | Description |
|-----------|-------------|
| Print Logo Toggle | Include logo on receipts |
| Tip Suggestion Percentages | Customizable tip % options on receipts (default: 15, 18, 20) |
| Receipt Language | en, es, it |
| Customer / Merchant / Itemized Copy | Toggle which receipt copies to print |
| Tip Calculation Base | pretax or posttax |

**API:** `POST /api/v1/print/receipt/{order_id}`, `POST /api/v1/print/ticket/{order_id}`

---

## 12. System & Appearance

| Component | Description |
|-----------|-------------|
| Language | English or Español |
| Update Channel | Stable or Beta |
| Theme | 13 themes: Terminal Glow (default), Pizza Palace, Neon Diner, Steakhouse, Tiki Bar, Ramen Shop, BBQ Pit, Seafood Shack, Speakeasy, Farm Table, Rooftop Bar, Atomic Purple, Rainbow |
| Debug Mode | Enable/disable debug mode (env var) |

---

## 13. Environment / Deployment Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `KINDPOS_APP_NAME` | Application name | KINDpos |
| `KINDPOS_APP_VERSION` | Version string | 0.1.0 |
| `KINDPOS_DEBUG` | Debug mode toggle | True |
| `KINDPOS_TERMINAL_ID` | Terminal identifier | terminal_01 |
| `KINDPOS_DATABASE_PATH` | Event ledger database path | ./data/event_ledger.db |
| `KINDPOS_HOST` | Server bind host | 127.0.0.1 |
| `KINDPOS_PORT` | Server bind port | 8000 |
| `KINDPOS_TAX_RATE` | Default tax rate | 0.07 |
| `KINDPOS_CASH_DISCOUNT_RATE` | Dual pricing discount | 0.04 |
| `KINDPOS_TIPOUT_PERCENT` | Default tipout percentage | 2.0 |
| `KINDPOS_DEFAULT_SUBNET` | Hardware discovery subnet | 10.0.0.0/24 |
| `KINDPOS_SCAN_TIMEOUT` | Hardware scan timeout (seconds) | 2.0 |

---

## Architecture Notes

- All user-facing configuration changes are persisted via an **event-sourced ledger** (SQLite), making every setting change auditable and reproducible.
- Hardware device configs are stored in a separate `hardware_config.db` SQLite database.
- The frontend has no persistent client-side state — all configuration is fetched from backend APIs.
- **13 configuration categories** spanning **100+ individual configurable fields** across store operations, menu, staffing, hardware, payments, and system settings.
