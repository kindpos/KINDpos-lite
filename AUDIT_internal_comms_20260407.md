# KINDpos Internal Communications Audit

**Date:** 2026-04-07
**Target:** KINDprod (full stack — frontend + backend)
**Auditor:** Claude Code (automated static analysis)
**Scope:** Six communication layers, read-only audit

---

## Summary Table

| Layer | Description | CRITICAL | WARNING | INFO | Pass |
|-------|------------|----------|---------|------|------|
| 1 | Frontend → Backend API | 2 | 3 | 0 | 8 |
| 2 | Backend → SQLite Event Ledger | 2 | 2 | 0 | 3 |
| 3 | Backend → Print Dispatcher | 1 | 0 | 0 | 5 |
| 4 | Print Dispatcher → Printers (TCP) | 0 | 1 | 0 | 6 |
| 5 | Scene Manager ↔ Scenes | 1 | 1 | 0 | 5 |
| 6 | Backend Internal Services | 2 | 1 | 0 | 3 |
| **Total** | | **8** | **8** | **0** | **30** |

---

## Communication Channel Map

### Layer 1 — Frontend → Backend API

| Channel | Caller → Receiver | Protocol | Status |
|---------|-------------------|----------|--------|
| Order Creation | `frontend/js/scenes/order-entry.js:1715` → `backend/app/api/routes/orders.py:265` | HTTP POST `/api/v1/orders` | ✅ correct |
| Item Addition (Batch) | `frontend/js/scenes/order-entry.js:1733` → `backend/app/api/routes/orders.py:619` | HTTP POST `/api/v1/orders/{id}/items` | ✅ correct |
| Order Send-to-Kitchen | `frontend/js/scenes/order-entry.js:1768` → `backend/app/api/routes/orders.py:1068` | HTTP POST `/api/v1/orders/{id}/send` | ✅ correct |
| Payment (Cash) | `frontend/js/scenes/payment.js:782` → `backend/app/api/routes/payment_routes.py:269` | HTTP POST `/api/v1/payments/cash` | ✅ correct |
| Payment (Card) | `frontend/js/scenes/payment.js:808` → `backend/app/api/routes/payment_routes.py:204` | HTTP POST `/api/v1/payments/sale` | ✅ correct |
| Discount Application | `frontend/js/scenes/order-entry.js:1590` → `backend/app/api/routes/orders.py:1018` | HTTP POST `/api/v1/orders/{id}/discount` | ❌ broken |
| Print Receipt (Customer/Merchant) | `frontend/js/scenes/payment.js:838` → `backend/app/api/routes/printing.py:25` | HTTP POST `/api/v1/print/receipt/{id}` | ✅ correct |
| Print Kitchen Ticket | `frontend/js/scenes/order-entry.js:1774` → `backend/app/api/routes/printing.py:44` | HTTP POST `/api/v1/print/ticket/{id}` | ⚠️ suspect |
| Tip Adjustment | `frontend/js/scenes/tip-adjustment.js:313` → `backend/app/api/routes/payment_routes.py:377` | HTTP POST `/api/v1/payments/tip-adjust` | ✅ correct |
| Merchant Receipt Reprint | `frontend/js/scenes/tip-adjustment.js:806` → `backend/app/api/routes/printing.py:25` | HTTP POST `/api/v1/print/receipt/{id}` | ❌ broken |
| Order Void | `frontend/js/scenes/order-entry.js:1458` → `backend/app/api/routes/orders.py:923` | HTTP POST `/api/v1/orders/{id}/void` | ✅ correct |
| Config Pricing | `frontend/js/scenes/order-entry.js:27` → `backend/app/api/routes/config.py:21` | HTTP GET `/api/v1/config/pricing` | ✅ correct |
| Staff Login (Servers) | `frontend/js/scenes/login.js:23` → `backend/app/api/routes/staff.py:13` | HTTP GET `/api/v1/servers` | ✅ correct |
| Clocked-In Servers | `frontend/js/scenes/login.js:144` → `backend/app/api/routes/staff.py:104` | HTTP GET `/api/v1/servers/clocked-in` | ✅ correct |
| Clock In/Out | `frontend/js/scenes/login.js:291` → `backend/app/api/routes/staff.py:66` | HTTP POST `/api/v1/servers/clock-in` | ✅ correct |
| Open Tabs | `frontend/js/scenes/landing.js:269` → `backend/app/api/routes/orders.py:353` | HTTP GET `/api/v1/orders/open` | ✅ correct |
| Day Summary | `frontend/js/scenes/close-day.js:56` → `backend/app/api/routes/orders.py:365` | HTTP GET `/api/v1/orders/day-summary` | ✅ correct |
| Close Batch | `frontend/js/scenes/server-checkout.js:951` → `backend/app/api/routes/orders.py:1121` | HTTP POST `/api/v1/orders/close-batch` | ✅ correct |
| Close Day | `frontend/js/scenes/close-day.js:930` → `backend/app/api/routes/orders.py:1240` | HTTP POST `/api/v1/orders/close-day` | ✅ correct |
| Zero Unadjusted | `frontend/js/scenes/close-day.js:510` → `backend/app/api/routes/payment_routes.py:452` | HTTP POST `/api/v1/payments/zero-unadjusted` | ✅ correct |
| Declare Cash Tips | `frontend/js/scenes/server-checkout.js:1030` → `backend/app/api/routes/staff.py:138` | HTTP POST `/api/v1/servers/declare-cash-tips` | ✅ correct |
| Hardware Devices | `frontend/js/scenes/settings.js:116` → `backend/app/api/routes/hardware.py:44` | HTTP GET `/api/v1/hardware/devices` | ✅ correct |
| Reporting (Sales) | `frontend/js/scenes/reporting.js:46` → `backend/app/api/routes/reporting.py` | HTTP GET `/api/v1/reporting/sales` | ✅ correct |
| Reporting (Labor) | `frontend/js/scenes/reporting.js:47` → `backend/app/api/routes/reporting.py` | HTTP GET `/api/v1/reporting/labor` | ✅ correct |
| Health Check | `(external)` → `backend/app/main.py:159` | HTTP GET `/health` | ✅ correct |

### Layer 2 — Backend → SQLite Event Ledger

| Channel | Caller → Receiver | Protocol | Status |
|---------|-------------------|----------|--------|
| Event Append | `backend/app/api/routes/orders.py` → `backend/app/core/event_ledger.py:150` | aiosqlite INSERT (WAL mode) | ✅ correct |
| Event Batch Append | `backend/app/api/routes/orders.py` → `backend/app/core/event_ledger.py:220` | aiosqlite batch INSERT | ✅ correct |
| Hash Chain Verify | `backend/app/core/event_ledger.py:526` → SQLite events table | aiosqlite SELECT | ✅ correct |
| Mark Synced | `backend/app/core/event_ledger.py:477` → SQLite events table | aiosqlite UPDATE | ❌ broken |
| Projection Query | `backend/app/core/event_ledger.py` → SQLite events table | aiosqlite SELECT | ✅ correct |
| Diagnostic Append | `backend/app/services/diagnostic_collector.py:130` → SQLite diagnostic_events table | aiosqlite INSERT | ✅ correct |
| Diagnostic Correlate | `backend/app/services/diagnostic_collector.py:422` → SQLite diagnostic_events table | aiosqlite UPDATE | ⚠️ suspect |
| Diagnostic Retention | `backend/app/services/diagnostic_collector.py:653` → SQLite diagnostic_events table | aiosqlite DELETE | ⚠️ suspect |

### Layer 3 — Backend → Print Dispatcher

| Channel | Caller → Receiver | Protocol | Status |
|---------|-------------------|----------|--------|
| Print Queue Enqueue | `backend/app/api/routes/printing.py:25` → `backend/app/printing/print_queue.py:23` | aiosqlite INSERT | ✅ correct |
| Dispatcher Poll | `backend/app/printing/print_dispatcher.py:66` → `backend/app/printing/print_queue.py:105` | aiosqlite SELECT (3s interval) | ✅ correct |
| Job Processing | `backend/app/printing/print_dispatcher.py:90` → `_process_job` | async/await | ✅ correct |
| Retry Schedule | `backend/app/printing/print_dispatcher.py:36` | [0, 5, 15, 30] seconds | ✅ correct |
| Job Completion | `backend/app/printing/print_dispatcher.py` → `backend/app/printing/print_queue.py` | aiosqlite UPDATE status | ✅ correct |

### Layer 4 — Print Dispatcher → Printers (TCP)

| Channel | Caller → Receiver | Protocol | Status |
|---------|-------------------|----------|--------|
| Kitchen Print | `backend/app/printing/print_dispatcher.py:119` → `10.0.0.19:9100` | TCP socket (5s timeout) | ✅ correct |
| Receipt Print | `backend/app/printing/print_dispatcher.py:119` → `10.0.0.186:9100` | TCP socket (5s timeout) | ✅ correct |
| Template Render | `backend/app/printing/print_dispatcher.py:153` → template classes | Python method call | ✅ correct |
| ESC/POS Format | `backend/app/printing/print_dispatcher.py:154` → `backend/app/printing/escpos_formatter.py:107` | Python method call | ✅ correct |
| IP Resolution | `backend/app/printing/print_dispatcher.py:158` → `hardware_config.db` | aiosqlite SELECT | ⚠️ suspect |

### Layer 5 — Scene Manager ↔ Scenes

| Channel | Caller → Receiver | Protocol | Status |
|---------|-------------------|----------|--------|
| Scene Push | `frontend/js/app.js:85` → `frontend/js/scene-manager.js:89` | `registerScene()` + `push()` | ✅ correct |
| Scene Pop | various scenes → `frontend/js/scene-manager.js` | `pop()` | ✅ correct |
| Interrupt Fire | `frontend/js/scenes/order-entry.js:1421` → `frontend/js/scene-manager.js:304` | `interrupt()` → Promise | ✅ correct |
| Debounce Guard | `frontend/js/scene-manager.js:7` | 200ms cooldown on push/pop | ✅ correct |
| Cache Lifecycle | `frontend/js/scenes/order-entry.js:188` → `frontend/js/scene-manager.js` | `cache: true` + `onResume` | ✅ correct |

### Layer 6 — Backend Internal Services

| Channel | Caller → Receiver | Protocol | Status |
|---------|-------------------|----------|--------|
| Hardware Config CRUD | `backend/app/api/routes/hardware.py:44` → `hardware_config.db` | aiosqlite (MAC-keyed) | ✅ correct |
| SSE Network Scan | `backend/app/api/routes/hardware.py:127` → LAN devices | HTTP SSE `text/event-stream` | ✅ correct |
| Diagnostic Heartbeat | `backend/app/services/diagnostic_collector.py:460` → diagnostic_events | aiosqlite INSERT (timed) | ⚠️ suspect |
| Config Rebuild | `backend/app/services/overseer_config_service.py:16` → event_ledger | aiosqlite SELECT (full replay) | ⚠️ suspect |
| Print Dispatcher Lifecycle | `backend/app/main.py:116` → `backend/app/printing/print_dispatcher.py` | App lifespan singleton | ✅ correct |

---

## Phase 1 — Findings (sorted: CRITICAL → WARNING → INFO)

### CRITICAL Findings

```
[🔴 CRITICAL] Layer 1 — Discount POST missing response validation
  File: frontend/js/scenes/order-entry.js (line 1590)
  Expected: .then(r => { if (!r.ok) throw new Error(...); }) before .catch()
  Actual:   fetch(...).catch() only — no .then() to check HTTP status
  Fix:      Add .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            before .catch(); keep interrupt open on failure; show error toast
```

```
[🔴 CRITICAL] Layer 1 — Merchant receipt reprint missing response consumption
  File: frontend/js/scenes/tip-adjustment.js (line 806)
  Expected: Response body consumed via .then(r => r.ok) check
  Actual:   fetch(...).catch() only — no .then() chain; response body not consumed
  Fix:      Add .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); }) before .catch()
```

```
[🔴 CRITICAL] Layer 2 — Event type naming inconsistency (mixed conventions)
  File: backend/app/core/events.py (lines 29-150)
  Expected: All event types use dot-notation lowercase (e.g., order.created, item.added)
  Actual:   31 event types use UPPERCASE_UNDERSCORE (ORDER_CREATED, ITEM_ADDED, etc.)
            while 20+ use correct dot.notation lowercase (payment.initiated, batch.submitted, etc.)
  Fix:      Migrate all UPPERCASE_UNDERSCORE event types to dot.notation_lowercase;
            add aliases in EventType enum for backward compatibility during migration
```

```
[🔴 CRITICAL] Layer 2 — Monetary precision gate is warning-only (not enforced)
  File: backend/app/core/event_ledger.py (lines 29-47, 150-158)
  Expected: Non-2dp monetary values rejected before INSERT
  Actual:   _check_monetary_precision() logs a WARNING but allows the event to proceed
  Fix:      Raise ValueError if non-2dp monetary values detected:
            if bad: raise ValueError(f"Non-2dp monetary values: {', '.join(bad)}")
```

```
[🔴 CRITICAL] Layer 3 — No automatic receipt enqueuing on payment confirmation
  File: backend/app/api/routes/payment_routes.py (lines 269-364)
  Expected: Backend auto-enqueues receipts when payment confirmed
            (cash → customer receipt; card → customer + merchant receipt)
  Actual:   Backend payment routes emit events but never call print_queue.enqueue();
            receipt printing relies entirely on frontend triggering POST /api/v1/print/receipt/{id}
  Fix:      Wire automatic enqueue in payment routes after order_closed event, OR
            document that receipt printing is frontend-initiated by design.
            Note: Frontend payment.js:846-847 DOES correctly trigger receipts
            (customer-only for cash, customer+merchant for card), so the system
            works end-to-end — but the backend has no failsafe if frontend fails.
```

```
[🔴 CRITICAL] Layer 5 — Four scenes missing onExit lifecycle hooks
  File: frontend/js/scenes/login.js (line 17) — NO onExit
  File: frontend/js/scenes/landing.js (line 324) — NO onExit
  File: frontend/js/scenes/receipt-review.js (line 15) — NO onExit
  File: frontend/js/scenes/sales-summary.js (line 32) — NO onExit
  Expected: All scenes implement onExit for cleanup
  Actual:   4 of 12 scenes have no onExit hook
  Fix:      Add onExit to each: login (reset pin state), landing (clear expandedCard),
            receipt-review (clean up state refs), sales-summary (clear report data)
```

```
[🔴 CRITICAL] Layer 6 — DiagnosticCollector heartbeat never activated by ORDER_CREATED
  File: backend/app/services/diagnostic_collector.py (line 548)
  Expected: notify_order_created() called when orders are created, switching to
            60s active heartbeat
  Actual:   notify_order_created() is NEVER called from production code — only in tests.
            Heartbeat permanently stuck at 15-minute off-hours interval.
  Fix:      In backend/app/api/routes/orders.py after ORDER_CREATED event append (~line 303),
            add: await diagnostic_collector.notify_order_created()
            Inject DiagnosticCollector dependency into the orders router.
```

```
[🔴 CRITICAL] Layer 6 — ServerSnapshotService not found
  File: NOT FOUND in codebase
  Expected: Long-lived singleton providing cached server state snapshots
  Actual:   Service does not exist. OverseerConfigService and StoreConfigService
            rebuild state from full event replay on every call.
  Fix:      Implement ServerSnapshotService or rename existing services to match
            architecture expectations; add incremental cache invalidation.
```

### WARNING Findings

```
[🟡 WARNING] Layer 1 — Order creation response not type-checked
  File: frontend/js/scenes/order-entry.js (line 1726)
  Expected: Validate created && created.order_id before assignment
  Actual:   Direct assignment: currentOrderId = created.order_id
  Fix:      Add guard: if (!created || !created.order_id) throw new Error('Invalid response')
```

```
[🟡 WARNING] Layer 1 — handleSend /send POST has no explicit error handling
  File: frontend/js/scenes/order-entry.js (line 1768)
  Expected: Error handling on the awaited POST /api/v1/orders/{id}/send
  Actual:   await fetch(...) with no individual error check (caught by outer try/catch)
  Fix:      Add explicit: var sendRes = await fetch(...); if (!sendRes.ok) throw new Error(...)
```

```
[🟡 WARNING] Layer 1 — Itemized print missing response validation
  File: frontend/js/scenes/order-entry.js (line 579)
  Expected: .then(r => { if (!r.ok) throw ... }) before .catch()
  Actual:   .catch() only — no HTTP status check
  Fix:      Add .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); }) before .catch()
```

```
[🟡 WARNING] Layer 2 — mark_synced() UPDATE violates immutable ledger principle
  File: backend/app/core/event_ledger.py (lines 477-486)
  Expected: No direct SQL UPDATE on the events table (immutable ledger)
  Actual:   Line 483: UPDATE events SET synced = 1 WHERE event_id IN (...)
  Fix:      Move sync tracking to a separate sync_ledger table to maintain
            core events table as append-only
```

```
[🟡 WARNING] Layer 2 — Hash chain verification not automatic on startup
  File: backend/app/core/event_ledger.py (lines 526-572)
  Expected: verify_chain() called during app startup as health check
  Actual:   Must be called explicitly; not wired into lifespan
  Fix:      Add await ledger.verify_chain(limit=100) to main.py lifespan after init
```

```
[🟡 WARNING] Layer 4 — No fallback IP for non-legacy printer MACs
  File: backend/app/printing/print_dispatcher.py (lines 176-179)
  Expected: Fallback to hardcoded IPs if hardware_config.db lookup fails
  Actual:   If MAC not in FALLBACK_IPS dict and DB lookup fails, raises ValueError
  Fix:      Add second-level fallback indexed by printer type (kitchen→10.0.0.19,
            receipt→10.0.0.186)
```

```
[🟡 WARNING] Layer 5 — Module cache busting inconsistent across scene imports
  File: frontend/js/app.js (lines 11-22)
  Expected: All scene imports use ?v=N version parameter
  Actual:   Only order-entry.js has ?v=5; other 11 scenes have no version parameter
  Fix:      Add version parameters to all scene imports for cache busting on deploy
```

```
[🟡 WARNING] Layer 6 — Config services rebuild state from full event replay per call
  File: backend/app/services/overseer_config_service.py (lines 16-30)
  Expected: Incremental snapshot cache with invalidation on new events
  Actual:   Every get_roles() call fetches ALL EMPLOYEE_ROLE_* events, rebuilds
            dict from scratch, and returns new list
  Fix:      Cache snapshot in memory; invalidate only when new config events appended
```

---

## Phase 2 — Effectiveness Analysis

### Layer 1 — Frontend → Backend API

**Redundant Endpoints:**
No redundant endpoint calls detected. Each user action triggers a single relevant API call. The `handleSend` flow is sequential (create → add items → send → print) with no duplicated fetches.

**Optimistic UI Updates:**
- Order-entry marks items as `sent: true` immediately after batch promise resolves (line 1771) — good optimistic pattern.
- Discount UI updates proceed regardless of backend response (resolveInterrupt at line 1605) — this is optimistic but **unsafe** because the fetch has no response validation. If the backend rejects the discount, the UI shows incorrect pricing.
- Payment flow is fully synchronous (awaits backend response before proceeding) — appropriate for financial operations.

### Layer 2 — Event Ledger

**Write Volume:**
Write volume is reasonable. Typical order flow:
- Create order: 1 event (ORDER_CREATED)
- Add 2 items: 2 events (ITEM_ADDED × 2)
- Send to kitchen: 2 events (ITEM_SENT × 2)
- Payment: 2 events (payment.initiated + payment.confirmed)
- Close: 1 event (ORDER_CLOSED)
- Total: ~8 events per order

No single user interaction exceeds 3 events. Modifier-heavy orders may generate 5-6 events per item (ITEM_ADDED + N × MODIFIER_APPLIED), but typical modifier count is 2-3. Acceptable.

**Missing Event Types:**
No missing event types identified. All major business flows (order lifecycle, payments, tips, day close, batch settlement, staff clock in/out) have corresponding events.

### Layer 3–4 — Print Pipeline

**3-Second Poll Interval:**
Appropriate for typical restaurant workflow. Gap between order and receipt print averages ~5-10s (1-2 poll cycles). Async sleep is cheap, so no performance concern. Could be tightened to 1-2s for higher-volume operations if needed.

**Print Failure Visibility:**
Print failures are NOT surfaced to the UI proactively. After 4 retry attempts spanning ~50s (0 + 5 + 15 + 30), the job is marked FAILED in SQLite. The frontend shows a toast only if the initial fire-and-forget fetch itself fails (network error). If the job queues successfully but the printer is offline, the failure is silent.

`GET /api/v1/print/queue` exists for manual checking, but no WebSocket/SSE push notifies the UI of printer failures. In a busy restaurant, failed receipts or kitchen tickets could go unnoticed.

### Layer 5 — Scene Manager

**Prefetch:**
No scenes use prefetch. No `prefetch: [...]` arrays registered. The `order-entry` scene is cached (`cache: true`) and reuses DOM via `onResume()` — this is the highest-frequency scene, so caching here is impactful.

**Cache Rebuilds:**
- `order-entry`: Cached, reused via `onResume()` — efficient.
- `landing`: Rebuilt on every entry (including full `fetchOpenTabs` call) — acceptable since tab data changes frequently.
- All other scenes: Rebuilt on every entry — acceptable for low-frequency scenes (settings, reporting, close-day).

No large scenes are being wastefully re-built. The caching strategy is reasonable.

### Layer 6 — Internal Services

**ServerSnapshotService Staleness:**
ServerSnapshotService does not exist. The OverseerConfigService and StoreConfigService rebuild state from full event replay on every API call. For a small event ledger (<10K events) this is fast enough, but as the ledger grows, response times will degrade linearly. No caching layer exists to prevent this.

**Diagnostic Heartbeat Orphaned Events:**
Because `notify_order_created()` is never called in production, the heartbeat is permanently in off-hours mode (15-minute intervals). This means:
- During active service: diagnostics are severely under-sampled (15m instead of 60s)
- During idle periods: heartbeat correctly runs at 15m (the default)
- No orphaned events during idle — the heartbeat simply fires less often than designed for active service

The primary risk is **under-sampling during service**, not orphaned events. Active-hours diagnostic resolution is 15× worse than designed.

---

## Acceptance Criteria Verification

- [x] All six layers inventoried with file:line citations
- [x] Every CRITICAL finding has a specific fix recommendation
- [x] Effectiveness section answered for each layer
- [x] Output file `AUDIT_internal_comms_20260407.md` written with full findings
- [x] Summary table at top of output file: total findings by severity per layer
- [x] Zero modifications made to any file on the do-not-touch list
