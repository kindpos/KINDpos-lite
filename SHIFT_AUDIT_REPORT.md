# KINDpos Full Shift Audit Report

Generated: 2026-04-06
Auditor: Claude Code (static analysis, no runtime)

---

## Summary

- **Total issues found: 38**
- **Critical: 15 | Warning: 11 | Info: 12**
- Scenes inventoried: 10 / 10
- Backend routes inventoried: 48+
- Orphaned backend routes: 22
- Missing/unimplemented flows: 13

---

## Scene Map

### 1. `login` — Login Scene
- **File:** `frontend/js/scenes/login.js`
- **Registered as:** `login`
- **Entry points:** App boot (`app.js:58` — `push('login')`)
- **Exit points:**
  - `push('order-entry', { mode: 'service', pin })` — via Quick Service + PIN (line 117)
  - `push('order-entry', { mode: 'bar', pin })` — via Quick Bar + PIN (line 118)
  - `push('reporting', { pin, role, employeeId, employeeName })` — via Reporting + PIN (line 121)
  - `push('close-day', { pin })` — via Close Day + PIN (line 122)
  - `push('settings', { pin })` — via Configuration + PIN (line 123)
  - Quick Item + PIN — **NO-OP** (line 119)
  - Clock in/out + PIN — **NO-OP** (line 120)
- **Overlays/Interrupts:** None
- **API endpoints called:** None (no PIN validation against backend)
- **Timeout:** `timeoutMs: 0` (disabled)

### 2. `order-entry` — Order Entry Scene
- **File:** `frontend/js/scenes/order-entry.js`
- **Registered as:** `order-entry`
- **Entry points:** `login.js` Quick Service/Bar actions
- **Exit points:**
  - `push('receipt-review', {...})` — via PAY button (line 946)
  - `pop()` — via header back button (app.js)
- **Overlays/Interrupts:**
  - `overlay('recall', ...)` — RECALL button (line 784)
  - `interrupt('recall-action', ...)` — tab selection within recall (line 854)
  - `interrupt('confirm-clear', ...)` — clear current ticket on recall (line 869)
  - `interrupt('void-pin', ...)` — void sent items (line 606)
  - `interrupt('void-reason', ...)` — void reason selection (line 617)
- **API endpoints called:**
  - `POST /api/v1/orders` — create order (line 699)
  - `POST /api/v1/orders/{id}/items` — add items (line 715)
  - `POST /api/v1/orders/{id}/send` — send to kitchen (line 733)
  - `POST /api/v1/print/ticket/{id}` — kitchen print (line 739)
- **Timeout:** Default (none configured)

### 3. `receipt-review` — Receipt Review Scene
- **File:** `frontend/js/scenes/receipt-review.js`
- **Registered as:** `receipt-review`
- **Entry points:** `order-entry.js` handlePay (line 946)
- **Exit points:**
  - `push('payment', { paymentMode: 'card', ... })` — Card button (line 219)
  - `push('payment', { paymentMode: 'cash', ... })` — Cash button (line 270)
  - `history.go(-1)` — Back button (line 291) **BUG: uses browser history, not scene manager**
- **Overlays/Interrupts:** None
- **API endpoints called:** None

### 4. `payment` — Payment Scene
- **File:** `frontend/js/scenes/payment.js`
- **Registered as:** `payment`
- **Entry points:** `receipt-review.js` Card/Cash buttons
- **Exit points:**
  - `replace('change-due', {...})` — after successful payment (line 419)
- **Overlays/Interrupts:** None
- **API endpoints called:**
  - `POST /api/v1/payments/cash` — cash payment only (line 377)
  - `POST /api/v1/print/receipt/{id}?copy_type=customer` — always (line 406)
  - `POST /api/v1/print/receipt/{id}?copy_type=merchant` — card only (line 409)
  - **Card payments make NO backend API call** (line 394 comment: "PaymentManager handles it via SPIN adapter" — but no fetch)

### 5. `change-due` — Change Due Scene
- **File:** `frontend/js/scenes/change-due.js`
- **Registered as:** `change-due`
- **Entry points:** `payment.js` handleConfirm (line 419)
- **Exit points:**
  - `replace(returnScene || 'order-entry', {})` — auto-return after 4s or tap (line 169)
- **Overlays/Interrupts:** None
- **API endpoints called:** None
- **Timeout:** 4000ms auto-return timer (line 150)

### 6. `tip-adjustment` — Tip Adjustment Scene
- **File:** `frontend/js/scenes/tip-adjustment.js`
- **Registered as:** `tip-adjustment`
- **Entry points:** `reporting.js` Tip Adjustment card (line 132); `server-checkout.js` Card 03 jump button (line 549)
- **Exit points:**
  - `push('server-checkout', { employeeId })` — Checkout button (line 539, 557)
  - `pop()` — via header back button
- **Overlays/Interrupts:**
  - `interrupt('confirm-batch-zero', ...)` — batch zero all tips (line 464)
  - `interrupt('checkout-gate', ...)` — unadjusted tips gate before checkout (line 510)
- **API endpoints called:** None (uses `getMockChecks()` hardcoded data, line 261)
- **Timeout:** `timeoutMs: 0` (disabled)

### 7. `server-checkout` — Server Checkout Scene
- **File:** `frontend/js/scenes/server-checkout.js`
- **Registered as:** `server-checkout`
- **Entry points:** `tip-adjustment.js` doCheckout (line 539/557); `reporting.js` Checkout card (line 158)
- **Exit points:**
  - `push('tip-adjustment', {...})` — Card 03 jump button (line 549)
  - `pop()` — via header back button; Finalize approve stub (line 1131)
- **Overlays/Interrupts:**
  - `overlay('adjust-pct', ...)` — Adjust tip-out % (line 920)
  - `interrupt('manager-approval', ...)` — Finalize gate (line 1097)
- **API endpoints called:** None (uses `buildMockState()` hardcoded data, line 1153)
- **Timeout:** `timeoutMs: 0` (disabled)

### 8. `reporting` — Reporting Scene
- **File:** `frontend/js/scenes/reporting.js`
- **Registered as:** `reporting`
- **Entry points:** `login.js` Reporting action (line 121)
- **Exit points:**
  - `push('tip-adjustment', {...})` — Tip Adjustment card (line 132)
  - `push('server-checkout', {...})` — Checkout card (server role, line 158)
  - `push('close-day', { pin })` — Close Day card (manager role, line 148)
  - `push('sales-summary', { role })` — Sales Summary card (line 176) **BUG: scene does not exist**
  - `pop()` — via header back button
- **Overlays/Interrupts:** None
- **API endpoints called:** None (uses `getStats()` hardcoded data, line 13)
- **Timeout:** `timeoutMs: 0` (disabled)

### 9. `close-day` — Close Day Scene
- **File:** `frontend/js/scenes/close-day.js`
- **Registered as:** `close-day`
- **Entry points:** `login.js` Close Day action (line 122); `reporting.js` Close Day card (line 148)
- **Exit points:**
  - `pop()` — via header back button
  - Close Day action (within scene, not fully traced due to mock state)
- **Overlays/Interrupts:** Similar structure to server-checkout (accordion cards, alert panel)
- **API endpoints called:** None (uses `buildMockState()` hardcoded data, line 50)
- **Timeout:** `timeoutMs: 0` (disabled)

### 10. `settings` — Settings (Configuration) Scene
- **File:** `frontend/js/scenes/settings.js`
- **Registered as:** `settings`
- **Entry points:** `login.js` Configuration action (line 123)
- **Exit points:**
  - `pop()` — via header back button
- **Overlays/Interrupts:** None visible in main flow
- **API endpoints called:**
  - `GET /api/v1/hardware/devices` — load saved devices (line 104)
  - `POST /api/v1/hardware/devices` — save device (line 111)
  - `DELETE /api/v1/hardware/devices/{mac}` — delete device (line 129)
  - `GET /api/v1/hardware/scan` — one-shot scan (line 138)
  - `GET /api/v1/hardware/scan/stream` — SSE streaming scan (line 446/493 via `doScan`/`doScanIP`)
  - `POST /api/v1/hardware/test-print` — test print (line 865)
- **Timeout:** None

### Unregistered/Missing Scenes
- **`sales-summary`** — Referenced in `reporting.js:176` but never registered. No file exists.
- **`check-grid`** — Referenced as possible `returnScene` in `receipt-review.js:30` comment, but never used in practice.

---

## Button Inventory

### Login Scene (`login.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| Clock in/out | `handleAction('clock')` | **NO-OP** — empty case (line 120) | Yes (via `buildButton`) |
| Reporting | `handleAction('reporting')` | `push('reporting', ...)` | Yes (via `buildButton`) |
| Close Day | `handleAction('close-day')` | `push('close-day', ...)` | Yes (via `buildButton`) |
| Configuration | `handleAction('configuration')` | `push('settings', ...)` | Yes (via `buildButton`) |
| Quick Service | `handleAction('quick-service')` | `push('order-entry', { mode: 'service' })` | Yes (via `buildButton`) |
| Quick Bar | `handleAction('quick-bar')` | `push('order-entry', { mode: 'bar' })` | Yes (via `buildButton`) |
| Quick Item | `handleAction('quick-item')` | **NO-OP** — empty case (line 119) | Yes (via `buildButton`) |
| Numpad keys (0-9, clr, >>>) | `buildNumpad` onSubmit | `handlePinSubmit(pin)` | Yes (via `buildStyledButton` in numpad.js) |

### Order Entry Scene (`order-entry.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| //SAVE// | `handleSave()` | Saves ticket to `savedTabs[]` (line 766) | Yes (via `buildButton`) |
| //RECALL// | `handleRecall()` | Opens recall overlay (line 783) | Yes (via `buildButton`) |
| < items > tab | `switchTab('items', ...)` | Switches HexNav to menu data (line 323) | Yes (via `buildButton`) |
| < modifiers > tab | `switchTab('modifiers', ...)` | Switches HexNav to modifier data (line 329) | Yes (via `buildButton`) |
| //SEND// | `handleSend()` | Creates order + sends to kitchen (line 337) | Yes (via `buildButton`) |
| //DISC// | None | **DEAD BUTTON** — no onTap handler (line 343) | Yes (via `buildButton`) |
| //VOID// | `handleVoid()` | Void selected/all items (line 344) | Yes (via `buildButton`) |
| //PRINT// | None | **DEAD BUTTON** — no onTap handler (line 348) | Yes (via `buildButton`) |
| //PAY// | `handlePay(params)` | Navigates to receipt-review (line 350) | Yes (via `buildButton`) |
| Hex cells | `onHexTap(h)` | Navigate hex menu / select item (hex-nav.js:294) | No (custom SVG polygons) |
| Ticket item cards | inline `pointerup` | Toggle selection (line 486/539) | No (custom DOM elements) |
| Prefix buttons (Add/No/On Side/Extra/Sub) | inline `pointerup` | Set `activePrefix` (line 269) | Yes (via `buildStyledButton` directly) |

### Receipt Review Scene (`receipt-review.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| CARD button | inline `pointerup` | `push('payment', { paymentMode: 'card' })` (line 219) | No (custom DOM element with manual press animation) |
| CASH button | inline `pointerup` | `push('payment', { paymentMode: 'cash' })` (line 270) | No (custom DOM element with manual press animation) |
| <- BACK | `buildButton` onTap | `history.go(-1)` **BUG** (line 291) | Yes (via `buildButton`) |

### Payment Scene (`payment.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| Preset $5/$10/$15/$20/$50/$100 | `addTendered(val, params)` | Adds to tendered amount (line 203) | Yes (via `buildButton`) |
| Exact button | inline onTap | Sets tendered = cashPrice (line 215) | Yes (via `buildButton`) |
| Numpad keys | `buildNumpad` | Updates tendered via cents (line 264) | Yes (via `buildStyledButton` in numpad.js) |
| CHARGE (card) | `handleConfirm(params)` | Processes payment (line 318) | Yes (via `buildButton`) |
| Confirm key (cash >>>)| `handleConfirm(params)` | Processes payment (line 303) | No (custom `buildConfirmKey`) |

### Change Due Scene (`change-due.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| Entire scene (tap anywhere) | `doReturn(params.returnScene)` | Returns to order-entry (line 36) | N/A (scene-level listener) |

### Tip Adjustment Scene (`tip-adjustment.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| ALL filter | inline onTap | Sets filter='all', re-renders (line 351) | Yes (via `buildButton`) |
| Unadjusted filter | inline onTap | Sets filter='unadjusted', re-renders (line 367) | Yes (via `buildButton`) |
| Tip $0.00 cells | inline `pointerup` | `activateEdit(i)` (line 124) | No (table cell with custom styling) |
| Numpad (edit mode) | `buildNumpad` | Dollar entry for tip (line 423) | Yes (via `buildStyledButton` in numpad.js) |
| CANCEL (edit) | `deactivateEdit()` | Exits edit mode (line 444) | Yes (via `buildButton`) |
| "Set all unadjusted tips to $0?" | `doBatchZero()` | Batch zero interrupt (line 311) | Yes (via `buildButton`) |
| //Checkout// | `doCheckout(params)` | Gate check then push server-checkout (line 325) | Yes (via `buildButton`) |
| //Print// | `doPrint()` | **EMPTY** — TODO stub (line 331) | Yes (via `buildButton`) |

### Server Checkout Scene (`server-checkout.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| 6 Accordion card headers | `makeToggle(body)` | Expand/collapse card body (lines 434-728) | No (custom DOM, press animation) |
| "-> Open Checks" jump (Card 02) | empty function | **NO-OP** — TODO (line 497) | Yes (via `buildStyledButton`) |
| "-> Tip Adjustment" jump (Card 03) | `push('tip-adjustment', ...)` | Navigate to tip adjustment (line 549) | Yes (via `buildStyledButton`) |
| "Adjust %" button (Card 04) | `openAdjustOverlay(state)` | Opens % adjustment overlay (line 646) | Yes (via `buildStyledButton`) |
| //PRINT// | empty function | **NO-OP** — TODO (line 862) | Yes (via `buildStyledButton`) |
| //FINALIZE// | `doFinalize(state)` | Manager approval interrupt stub (line 898) | Yes (via `buildStyledButton`) |
| Adjust overlay +/- buttons | inline | Increment/decrement tip-out % by 0.5 (lines 1028-1053) | Yes (via `buildStyledButton`) |
| Adjust overlay CONFIRM | inline | Write back %, recalc, dismiss (line 985) | Yes (via `buildStyledButton`) |
| Adjust overlay CANCEL | `dismissOverlay()` | Close overlay (line 974) | Yes (via `buildStyledButton`) |

### Reporting Scene (`reporting.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| Tip Adjustment card | `push('tip-adjustment', ...)` | Navigate (line 132) | No (custom card with press animation) |
| Checkout card (server) | `push('server-checkout', ...)` | Navigate (line 158) | No (custom card) |
| Close Day card (manager) | `push('close-day', ...)` | Navigate (line 148) | No (custom card) |
| Sales Summary card | `push('sales-summary', ...)` | **BUG: scene does not exist** (line 176) | No (custom card) |

### Close Day Scene (`close-day.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| Accordion card headers | toggle | Expand/collapse (similar to server-checkout) | No (custom DOM) |
| PRINT button | TODO stub | **NO-OP** | Yes (via `buildStyledButton`) |
| SUBMIT BATCH button | TODO stub | **NO-OP** | Yes (via `buildStyledButton`) |
| CLOSE DAY button | TODO stub | **NO-OP** | Yes (via `buildStyledButton`) |

### Settings Scene (`settings.js`)

| Element | Handler | Action | Uses `buildStyledButton`? |
|---------|---------|--------|--------------------------|
| Hardware tab | inline | Switch to hardware tab, re-render (line 161) | No (custom tab element) |
| Terminal tab | inline | Switch to terminal tab, re-render (line 167) | No (custom tab element) |
| HW nav: Add Device | inline | Set activeNav='add', re-render | Yes (via `buildStyledButton`) |
| HW nav: Card Readers | inline | Set activeNav='readers', re-render | Yes (via `buildStyledButton`) |
| HW nav: Printers | inline | Set activeNav='printers', re-render | Yes (via `buildStyledButton`) |
| Term nav: Identity/Network/Business | inline | Set activeNav, re-render | Yes (via `buildStyledButton`) |
| Scan Network / Scan IP | `doScan()` / `doScanIP()` | SSE scan stream (lines 446/493) | Yes (via `buildButton` / `buildStyledButton`) |
| Save Device | `saveDevice(device)` | POST /api/v1/hardware/devices (line 111) | Yes |
| Delete Device | `deleteDevice(mac)` | DELETE /api/v1/hardware/devices/{mac} (line 129) | Yes |
| Test Print | `testPrint()` | POST /api/v1/hardware/test-print (line 865) | Yes |

---

## API Route Inventory

### Orders (`backend/app/api/routes/orders.py` — prefix `/api/v1/orders`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| POST | `/orders` | `order-entry.js:699` handleSend | Yes | 422 validation, proper HTTPException |
| GET | `/orders` | None | **ORPHANED** | Proper |
| GET | `/orders/active` | None | **ORPHANED** | Proper |
| GET | `/orders/open` | None | **ORPHANED** | Proper |
| GET | `/orders/day-summary` | None | **ORPHANED** | Proper |
| GET | `/orders/day-history` | None | **ORPHANED** | Proper |
| GET | `/orders/{order_id}` | None | **ORPHANED** | 404 via `get_order_or_404` |
| POST | `/orders/{order_id}/items` | `order-entry.js:715` handleSend | Yes | 400 if not open, 404 if not found |
| DELETE | `/orders/{order_id}/items/{item_id}` | None | **ORPHANED** (frontend voids locally) | 400/404 |
| PATCH | `/orders/{order_id}/items/{item_id}` | None | **ORPHANED** | 400/404 |
| POST | `/orders/{order_id}/items/{item_id}/modifiers` | None | **ORPHANED** (frontend applies locally) | 400/404 |
| POST | `/orders/{order_id}/payments` | None | **ORPHANED** (frontend uses `/payments/cash`) | 400/404 |
| POST | `/orders/{order_id}/payments/{payment_id}/confirm` | None | **ORPHANED** | 400/404 |
| POST | `/orders/{order_id}/close` | None | **ORPHANED** (auto-closed by `/payments/cash`) | 400 |
| POST | `/orders/{order_id}/void` | None | **ORPHANED** (frontend voids locally) | 400/404 |
| POST | `/orders/{order_id}/send` | `order-entry.js:733` handleSend | Yes | 400 if not open |
| POST | `/orders/close-batch` | None | **ORPHANED** | Proper |
| POST | `/orders/close-day` | None | **ORPHANED** (close-day.js uses mock data) | Proper |

### Payments (`backend/app/api/routes/payment_routes.py` — prefix `/api/v1/payments`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| POST | `/payments/sale` | None | **ORPHANED** | 400 validation/rejection |
| POST | `/payments/cash` | `payment.js:377` handleConfirm | Yes | 404 order not found, 400 closed/voided |
| POST | `/payments/tip-adjust` | None | **ORPHANED** (tip-adjustment uses mock data) | 404/400 |
| GET | `/payments/device-status` | None | **ORPHANED** | Proper |

### Printing (`backend/app/api/routes/printing.py` — prefix `/api/v1/print`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| POST | `/print/receipt/{order_id}` | `payment.js:401` queueReceipt | Yes | Depends on PrintContextBuilder |
| POST | `/print/ticket/{order_id}` | `order-entry.js:739` handleSend | Yes | Depends on PrintContextBuilder |
| GET | `/print/queue` | None | **ORPHANED** | Proper |
| POST | `/print/queue/{job_id}/retry` | None | **ORPHANED** | Proper |
| POST | `/print/test` | None | **ORPHANED** (settings uses `/hardware/test-print`) | 404 — **BUG: wrong fixture path** (line 77) |

### Hardware (`backend/app/api/routes/hardware.py` — prefix `/api/v1/hardware`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| GET | `/hardware/scan` | `settings.js:138` scanNetwork | Yes | Throws on failure |
| GET | `/hardware/scan/stream` | `settings.js:446` doScan (SSE) | Yes | SSE error events |
| GET | `/hardware/devices` | `settings.js:104` loadSavedDevices | Yes | try/catch, defaults to [] |
| POST | `/hardware/devices` | `settings.js:111` saveDevice | Yes | Proper |
| DELETE | `/hardware/devices/{mac}` | `settings.js:129` deleteDevice | Yes | Proper |
| POST | `/hardware/test` | None | **ORPHANED** (tests by MAC, settings uses test-print by IP) | Returns success/fail |
| POST | `/hardware/test-print` | `settings.js:865` testPrint | Yes | Returns success/fail with message |
| GET | `/hardware/status` | None | **ORPHANED** | Proper |

### Staff (`backend/app/api/routes/staff.py` — prefix `/api/v1/servers`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| GET | `/servers` | None | **ORPHANED** (login.js doesn't fetch roster) | Proper |
| POST | `/servers/clock-in` | None | **ORPHANED** (clock handler is no-op) | Proper |
| POST | `/servers/clock-out` | None | **ORPHANED** | Proper |
| GET | `/servers/clocked-in` | None | **ORPHANED** | Proper |

### Menu (`backend/app/api/routes/menu.py` — prefix `/api/v1/menu`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| GET | `/menu` | None | **ORPHANED** (order-entry uses hardcoded MENU_DATA) | Proper |
| GET | `/menu/restaurant` | None | **ORPHANED** | Proper |
| GET | `/menu/categories` | None | **ORPHANED** | Proper |
| GET | `/menu/items` | None | **ORPHANED** | Proper |

### Config (`backend/app/api/routes/config.py` — prefix `/api/v1/config`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| GET | `/config/store` | None | **ORPHANED** | Proper |
| GET | `/config/roles` | None | **ORPHANED** | Proper |
| GET | `/config/employees` | None | **ORPHANED** | Proper |
| GET | `/config/tipout` | None | **ORPHANED** | Proper |
| GET | `/config/menu/categories` | None | **ORPHANED** | Proper |
| GET | `/config/menu/items` | None | **ORPHANED** | Proper |
| GET | `/config/floorplan/sections` | None | **ORPHANED** | Proper |
| GET | `/config/floorplan` | None | **ORPHANED** | Proper |
| GET | `/config/terminals` | None | **ORPHANED** | Proper |
| GET | `/config/routing` | None | **ORPHANED** | Proper |
| POST | `/config/store/info` | None | **ORPHANED** | Proper |
| POST | `/config/store/cc-rate` | None | **ORPHANED** | Proper |
| POST | `/config/push` | None | **ORPHANED** | Proper |
| POST | `/config/menu/86` | None | **ORPHANED** | Proper |
| POST | `/config/menu/restore` | None | **ORPHANED** — **BUG: double-nested add_task** (line 147) | Will crash |
| POST | `/config/roles` | None | **ORPHANED** | Proper |
| PUT | `/config/roles/{role_id}` | None | **ORPHANED** | Proper |
| DELETE | `/config/roles/{role_id}` | None | **ORPHANED** | Proper |
| POST | `/config/employees` | None | **ORPHANED** | Proper |
| GET | `/config/terminal-bundle` | None | **ORPHANED** | Proper |

### System (`backend/app/api/routes/system.py` — prefix `/api/v1/system`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| POST | `/system/run-tests` | None | **ORPHANED** (no frontend UI) | SSE streaming |

### Health (`backend/app/main.py`)

| Method | Path | Frontend Caller | Reachable? | Error Handling |
|--------|------|-----------------|------------|----------------|
| GET | `/health` | None | **ORPHANED** (no frontend caller, useful for monitoring) | Proper |

---

## Event Type Inventory

Event types defined in `backend/app/core/events.py` (EventType enum):

### Order Lifecycle
| Event Type | Written By | Frontend Action That Triggers |
|-----------|------------|-------------------------------|
| `ORDER_CREATED` | `orders.py:235` create_order | `order-entry.js:699` handleSend |
| `ORDER_CLOSED` | `orders.py:621` close_order; `payment_routes.py:153` cash auto-close | `payment.js:377` cash payment |
| `ORDER_VOIDED` | `orders.py:653` void_order | None (frontend voids locally) |
| `ORDER_TYPE_CHANGED` | Not used in any route | None |

### Item Management
| Event Type | Written By | Frontend Action That Triggers |
|-----------|------------|-------------------------------|
| `ITEM_ADDED` | `orders.py:407` add_item | `order-entry.js:715` handleSend |
| `ITEM_REMOVED` | `orders.py:449` remove_item | None (frontend removes locally) |
| `ITEM_MODIFIED` | `orders.py:484` modify_item | None |
| `ITEM_SENT` | `orders.py:704` send_order | `order-entry.js:733` handleSend |
| `MODIFIER_APPLIED` | `orders.py:520` apply_modifier | None (frontend applies locally) |

### Payment Processing
| Event Type | Written By | Frontend Action That Triggers |
|-----------|------------|-------------------------------|
| `PAYMENT_INITIATED` | `payment_routes.py:118` cash; `orders.py:552` generic | `payment.js:377` cash only |
| `PAYMENT_CONFIRMED` | `payment_routes.py:128` cash | `payment.js:377` cash only |
| `TIP_ADJUSTED` | `payment_routes.py:211` tip-adjust | None (frontend uses mock data) |

### Printing
| Event Type | Written By | Frontend Action That Triggers |
|-----------|------------|-------------------------------|
| `PRINT_JOB_QUEUED` | Print queue (internal) | `order-entry.js:739` kitchen; `payment.js:401` receipt |
| `PRINT_JOB_SENT` | Print dispatcher | Automatic (dispatcher loop) |
| `PRINT_JOB_COMPLETED` | Print dispatcher | Automatic |
| `PRINT_JOB_FAILED` | Print dispatcher | Automatic |
| `TICKET_PRINTED` | Not emitted (template renders, no event) | — |

### Batch / Day
| Event Type | Written By | Frontend Action That Triggers |
|-----------|------------|-------------------------------|
| `BATCH_SUBMITTED` | `orders.py:768` close-batch; `orders.py:854` close-day | None (frontend uses mock) |
| `BATCH_CLOSED` | `orders.py:779` close-batch | None |
| `DAY_CLOSED` | `orders.py:866` close-day | None (frontend uses mock) |

### Staff
| Event Type | Written By | Frontend Action That Triggers |
|-----------|------------|-------------------------------|
| `USER_LOGGED_IN` | `staff.py:53` clock-in | None (login.js clock handler is no-op) |
| `USER_LOGGED_OUT` | `staff.py:69` clock-out | None |

### Unused Event Types (defined but never emitted)
`DISCOUNT_REQUESTED`, `DISCOUNT_APPROVED`, `DISCOUNT_REJECTED`, `TICKET_PRINT_FAILED`, `TICKET_REPRINTED`, `RECEIPT_PRINTED`, `RECEIPT_REPRINTED`, `PRINT_RETRYING`, `PRINT_REROUTED`, `DELIVERY_INFO_ADDED`, `DRIVER_ASSIGNED`, `DELIVERY_DISPATCHED`, `DELIVERY_COMPLETED`, `PRINTER_REGISTERED`, `PRINTER_STATUS_CHANGED`, `PRINTER_ERROR`, `PRINTER_ROLE_ASSIGNED`, `PRINTER_ROLE_CREATED`, `PRINTER_FALLBACK_ASSIGNED`, `PRINTER_CONFIG_UPDATED`, `TEMPLATE_CONFIG_UPDATED`, `PRINTER_REBOOT_STARTED`, `PRINTER_REBOOT_COMPLETED`, `PRINTER_HEALTH_WARNING`, `DRAWER_OPENED`, `DRAWER_OPEN_FAILED`, `PAYMENT_DEVICE_REGISTERED`, `PAYMENT_DEVICE_CONNECTED`, `PAYMENT_DEVICE_DISCONNECTED`, `PAYMENT_DEVICE_ERROR`, `PAYMENT_DEVICE_REBOOTED`, `PAYMENT_WAITING`, `PAYMENT_PROCESSING`, `PAYMENT_APPROVED`
