# KINDpos-lite Frontend Stress Audit

**Date:** 2026-04-06
**Target:** 1024×600 touch display, all scenes in `/frontend/js/scenes/`
**Method:** Static analysis of adversarial interaction sequences

---

## Architecture Overview

**Scene Manager v2** (`scene-manager.js`) uses a three-tier model: Scenes → Overlays → Interrupts.

- **200ms debounce** protects `push()`, `pop()`, `replace()` ONLY
- **Overlays** stack (unlimited depth), no debounce on `overlay()` or `dismissOverlay()`
- **Interrupts** are singleton — second call rejects with `Error('Interrupt already active')`
- `resolveInterrupt()` / `cancelInterrupt()` have **no debounce**

**buildStyledButton** (`tokens.js:101-139`) provides **visual press feedback only** (bevel inversion + translate). No functional debounce.

**buildButton** (`components.js:8-35`) wraps buildStyledButton, adds `pointerup` → `onTap`. **No debounce.**

**buildNumpad** (`numpad.js:21-157`) fires `onSubmit`/`onChange` on `pointerup`. **No debounce.** Has `maxDigits` limit but no double-submit guard.

---

## Findings Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 5 |
| 🟡 WARNING | 12 |
| 🟢 INFO | 5 |

---

## 🔴 CRITICAL Findings

### F-01: Double-charge on payment confirm (FINANCIAL RISK)

**File:** `frontend/js/scenes/payment.js:370-425`
**Reproduction:** Tap CHARGE or numpad >>> twice rapidly (<200ms apart)
**Root cause:** `handleConfirm()` is `async` with no guard flag. Three unprotected entry points:
- Numpad `onSubmit` (line 270) — fires when `tendered >= cashPrice`
- Cash confirm key `buildConfirmKey` (line 307-311) — `pointerup` calls `handleConfirm()`
- Card CHARGE button `buildConfirmBtn` (line 316-319) — `onTap` calls `handleConfirm()`

Each tap fires a POST to `/api/v1/payments/cash`. Two rapid taps = two payment POSTs = **double charge**. After the first completes, `replace('change-due')` fires — the second invocation may attempt to navigate after the scene is already torn down.

**Suggested fix:** Add a module-scoped `isProcessing` flag. Set `true` at the top of `handleConfirm`, guard with early return, reset in `catch`/`finally`.

---

### F-02: Double-send creates duplicate order items

**File:** `frontend/js/scenes/order-entry.js:691-748`
**Reproduction:** Tap //SEND// twice rapidly
**Root cause:** `handleSend()` is `async` with no guard. First call creates the order (POST `/api/v1/orders`, sets `currentOrderId` at line 709). Second concurrent call finds `currentOrderId` still null (Promise hasn't resolved), attempts a second POST `/api/v1/orders` �� creating a **duplicate order**.

Even if the second call arrives after `currentOrderId` is set, it re-POSTs all items where `inst.sent === false` (line 713). Items are only marked `sent: true` after `Promise.all` resolves (line 736), so the second call re-POSTs all of them.

**Suggested fix:** Add `isSending` guard flag. Set before first await, clear in finally block.

---

### F-03: SEND→PAY rapid succession race condition

**File:** `frontend/js/scenes/order-entry.js:928-956`
**Reproduction:** Tap //SEND// then //PAY// within 200ms
**Root cause:** PAY calls `await handleSend()` internally (line 932-933) if `currentOrderId` is null. If SEND was already tapped, two `handleSend()` invocations overlap. Both see `currentOrderId === null`, both POST to create a new order. The second order creation overwrites `currentOrderId`, orphaning the first order on the server.

**Suggested fix:** Same `isSending` guard as F-02 covers this. PAY should also check the flag and early-return if a send is in progress.

---

### F-04: history.go(-1) bypasses Scene Manager

**File:** `frontend/js/scenes/receipt-review.js:291`
**Reproduction:** Navigate: order-entry → receipt-review → payment (via card/cash) → back. Then tap BACK on receipt-review.
**Root cause:** BACK button uses `history.go(-1)` instead of `pop()`. After `replace()` calls (e.g., change-due replaces payment in the stack), browser history and Scene Manager's `navStack` diverge. `history.go(-1)` could navigate to a destroyed scene, the change-due screen, or even outside the SPA.

**Suggested fix:** Replace `history.go(-1)` with `pop()` from scene-manager.

---

### F-05: Void interrupt chain has microtask timing gap

**File:** `frontend/js/scenes/order-entry.js:606-613`
**Reproduction:** During void flow, tap rapidly while PIN interrupt resolves
**Root cause:** At line 610, `resolveInterrupt()` synchronously sets `activeInterrupt = null`, removes DOM, and calls `resolve()`. Then line 611 immediately calls `showVoidReasons()` which creates a new `interrupt('void-reason')`. Between `resolveInterrupt` completing and the new interrupt's DOM rendering, there's a microtask gap where `activeInterrupt` is null. If another pointer event fires during this gap (e.g., a queued touch event), it could trigger a competing interrupt → `reject(Error('Interrupt already active'))` → swallowed by `.catch(function() {})`.

**Suggested fix:** Chain the void-reason interrupt off the resolution promise rather than calling it synchronously after resolve. Or use a single overlay with swapped content instead of two sequential interrupts.

---

## 🟡 WARNING Findings

### W-01: Numpad submit double-tap amplifies F-01

**File:** `frontend/js/numpad.js:126-128`
**Reproduction:** Tap >>> key twice rapidly on payment screen
**Root cause:** Submit key fires `onSubmit(pin)` on every `pointerup` with no cooldown. On payment scene, this calls `handleConfirm()` — amplifying the double-charge risk from F-01.

**Suggested fix:** Add a one-shot guard or short debounce (200ms) on submit key.

---

### W-02: Preset cash buttons accumulate on rapid tap

**File:** `frontend/js/scenes/payment.js:200-204, 333-337`
**Reproduction:** Tap $100 preset button 3 times rapidly
**Root cause:** `addTendered(val, params)` (line 333) adds `val` to `tendered` each tap. Three rapid taps on $100 = $300 tendered. Not a crash, but operator may not intend this — no visual "processing" state between taps.

**Suggested fix:** Brief visual feedback (button disable/flash) after preset tap. Or replace additive behavior with set behavior.

---

### W-03: Promise.all partial failure leaves inconsistent item state

**File:** `frontend/js/scenes/order-entry.js:714-736`
**Reproduction:** SEND with multiple items when server is partially reachable
**Root cause:** `Promise.all(itemPromises)` rejects if ANY item POST fails. But some items may already be created server-side. All items stay `sent: false` locally (line 736 never executes), so retry re-POSTs already-created items as duplicates.

**Suggested fix:** Use `Promise.allSettled()` and mark individual items as sent based on individual results. Or use a single batch POST endpoint.

---

### W-04: Fire-and-forget print calls with no retry or notification

**Files:** `payment.js:400-412`, `order-entry.js:739-740`
**Reproduction:** Payment confirms, receipt printer is offline
**Root cause:** Print calls use `.catch(function(err) { console.warn(...); })`. No retry. No user notification. Customer may not receive receipt; kitchen may not receive ticket.

**Suggested fix:** Track print status and show a toast/alert if print fails. Add retry logic or at minimum surface the failure in UI.

---

### W-05: Card CHARGE button fires without card reader confirmation

**File:** `frontend/js/scenes/payment.js:315-323`
**Reproduction:** On card payment screen, tap CHARGE before card is inserted
**Root cause:** `buildConfirmBtn` (line 316) is always visible and tappable. For card mode, `handleConfirm` skips the fetch (line 392-394, comment says "PaymentManager handles it") and proceeds directly to `replace('change-due')` at line 419 — showing "PAYMENT APPROVED" without actual card authorization.

**Suggested fix:** Disable CHARGE button until card reader signals authorization, or gate `replace('change-due')` behind PaymentManager confirmation.

---

### W-06: EventSource race when rapid-tapping scan buttons

**File:** `frontend/js/scenes/settings.js:435-523`
**Reproduction:** Tap "Scan Network" then immediately tap "Enter IP → Scan"
**Root cause:** Both `doScan()` and `doScanIP()` close existing EventSource and open new one. If the close/open happens fast enough, the `onmessage` handler of the dying stream could fire after the new stream opens, corrupting `state.scanResults`.

**Suggested fix:** Add a scan generation counter. Ignore messages from stale EventSources.

---

### W-07: Close Day / Finalize buttons disabled via CSS only

**Files:** `close-day.js:941-944`, `server-checkout.js:892-896`
**Reproduction:** Programmatic event dispatch or browser devtools
**Root cause:** Blocked state uses `pointerEvents: 'none'` CSS — no JavaScript-level guard. A synthetic `pointerup` event could bypass this. Low probability on a dedicated terminal, but not zero.

**Suggested fix:** Add JavaScript guard in the `pointerup` handler: `if (isBlocked(state)) return;`

---

### W-08: Change-due double-return race

**File:** `frontend/js/scenes/change-due.js:36-38, 150-152`
**Reproduction:** Tap screen at exactly the 4-second auto-return moment
**Root cause:** Both tap handler (line 36) and `setTimeout` (line 150) call `doReturn()`. If both fire within 200ms, `replace()` is called twice. Second call is caught by Scene Manager's `debounceCheck` — but the first `replace` already tore down the scene, so `doReturn`'s `clearTimeout` (line 164) tries to clear an already-fired timer. Harmless but noisy.

**Suggested fix:** Add `returned` flag in `doReturn()`, early-return if already called.

---

### W-09: Tip-adjustment table cell has no debounce

**File:** `frontend/js/scenes/tip-adjustment.js:123-125`
**Reproduction:** Rapidly tap different tip cells in the table
**Root cause:** `pointerup` calls `activateEdit(i)` directly. Rapid tapping could cause `editingIndex` to bounce between values, causing rapid DOM re-renders via `renderTable()`.

**Suggested fix:** Debounce `activateEdit` or ignore taps while already in edit mode for a different row.

---

### W-10: Accordion toggle has no debounce (server-checkout, close-day)

**Files:** `server-checkout.js:354-357`, `close-day.js:352-356`
**Reproduction:** Rapidly tap accordion header 10 times
**Root cause:** Each `pointerup` toggles `body.style.display` and updates chevron. Rapid toggling causes DOM thrash — repeated show/hide with potential layout reflow each cycle.

**Suggested fix:** Add a short debounce (100ms) or ignore toggles while animating.

---

### W-11: Overlay can render during scene transition

**File:** `scene-manager.js:228-252`
**Reproduction:** Call `overlay()` during a `push()` transition
**Root cause:** `overlay()` has no check for whether a scene transition is in progress. If an overlay opens while `push()` is running (e.g., from a timer callback), it pauses the scene that's being torn down — potential null reference.

**Suggested fix:** (Cannot modify scene-manager.js per scope) — Guard overlay calls in scene code with active-scene checks.

---

### W-12: Device delete has no confirmation

**File:** `frontend/js/scenes/settings.js:852`
**Reproduction:** Tap "Remove" button on a saved device
**Root cause:** `deleteDevice(dev.mac)` fires immediately on tap with no confirmation interrupt. Accidental tap deletes the device with no undo.

**Suggested fix:** Add confirmation interrupt before delete.

---

## 🟢 INFO Findings

### I-01: All buildStyledButton/buildButton instances lack per-element debounce

Every button across all 10 scenes uses either `buildButton` or `buildStyledButton`, neither of which includes functional debounce. The only debounce is Scene Manager's 200ms guard on navigation calls. Buttons that trigger non-navigation actions (state updates, API calls, overlays) are completely unprotected.

**Total interactive elements inventoried:** 87 buttons + 12 numpad keys + ~7 table cells + 10 accordion headers + 4 reporting cards = **~120 interactive elements**, of which only those calling `push`/`pop`/`replace` are debounced.

---

### I-02: Receipt-review CARD/CASH buttons use manual event handlers

**File:** `frontend/js/scenes/receipt-review.js:212-281`
These buttons implement custom `pointerdown`/`pointerup` handlers rather than using `buildStyledButton`. They work correctly but bypass any future debounce added to the utility. The `push('payment')` call inside them IS protected by Scene Manager debounce.

---

### I-03: Payment numpad allows max $99,999.99

**File:** `frontend/js/scenes/payment.js:259` (`maxDigits: 7`)
Seven digits = max input of $99,999.99. While technically valid, no "are you sure?" check for amounts over, say, $500 on a quick-service POS.

---

### I-04: Login numpad has no rate limiting

**File:** `frontend/js/scenes/login.js:99-103`
PIN entry numpad allows rapid digit entry. Not a crash risk (maxDigits: 6 caps it), but enables brute-force PIN testing with no lockout.

---

### I-05: Sales Summary navigates to unregistered scene

**File:** `frontend/js/scenes/reporting.js:176`
`push('sales-summary', { role: role })` — if `sales-summary` scene is not registered, Scene Manager logs an error and returns silently (line 84 of scene-manager.js). No crash, but dead button.

---

## Appendix A: buildStyledButton Call Inventory

| Scene | Line | Element | Handler | Debounce |
|-------|------|---------|---------|----------|
| order-entry.js | 259 | Prefix buttons (×5) | Toggle active prefix | ❌ None |
| close-day.js | 375 | Accordion card button | `onTap` callback | ❌ None |
| close-day.js | 792 | Batch dialog buttons | Submit/Cancel/OK | ❌ None (has `running` guard on submit) |
| close-day.js | 893 | PRINT button | TODO: POST print | ❌ None |
| close-day.js | 904 | SUBMIT BATCH button | `openBatchOverlay()` | ❌ None |
| close-day.js | 934 | CLOSE DAY button | `doCloseDay()` | ❌ None (CSS gate) |
| settings.js | 398 | Device action buttons | Various | ❌ None |
| settings.js | 908 | Setting item rows | `openSettingEditor()` | ❌ None |
| server-checkout.js | 395 | Accordion jump buttons | `onTap` callback | ❌ None |
| server-checkout.js | 854 | PRINT button | TODO: POST print | ❌ None |
| server-checkout.js | 884 | FINALIZE button | `doFinalize()` | ❌ None (CSS gate) |
| server-checkout.js | 967 | Overlay CANCEL button | `dismissOverlay()` | ❌ None |
| server-checkout.js | 978 | Overlay CONFIRM button | State write + dismiss | ��� None |
| server-checkout.js | 1028 | Decrease % button | Decrement percent | ❌ None |
| server-checkout.js | 1045 | Increase % button | Increment percent | ❌ None |

## Appendix B: Async Handler Concurrency Map

| Handler | File:Line | Entry Points | Guard Flag | Risk |
|---------|-----------|-------------|------------|------|
| `handleSend()` | order-entry.js:691 | SEND button, PAY button (internal) | ❌ None | 🔴 Duplicate orders/items |
| `handlePay()` | order-entry.js:928 | PAY button | ❌ None | 🔴 Race with handleSend |
| `handleConfirm()` | payment.js:370 | Numpad >>>, Confirm key, CHARGE btn | ❌ None | 🔴 Double payment |
| `loadSavedDevices()` | settings.js:102 | Scene enter | N/A (read-only) | 🟢 Safe |
| `saveDevice()` | settings.js:109 | ADD ANYWAY, SAVE buttons | ❌ None | 🟡 Duplicate save |
| `deleteDevice()` | settings.js:127 | Remove button | ❌ None | 🟡 No confirmation |
| `scanNetwork()` | settings.js:135 | Not directly called by UI | N/A | 🟢 Safe |
| `doScan()` (SSE) | settings.js:435 | Scan Network button | Closes prior ES | 🟡 Race window |
| `doScanIP()` (SSE) | settings.js:486 | IP scan flow | Closes prior ES | 🟡 Race window |
| `testDevice()` | settings.js:861 | Test button | ❌ None | 🟡 Concurrent tests |

## Appendix C: Overlay/Interrupt Stacking Matrix

| Scene | Creates Overlay | Creates Interrupt | Potential Conflict |
|-------|----------------|-------------------|-------------------|
| order-entry.js | `recall` overlay | `void-pin`, `void-reason`, `recall-action`, `confirm-clear` | Void chains two interrupts sequentially (F-05) |
| tip-adjustment.js | None | `confirm-batch-zero`, `checkout-gate` | Gate resolves then navigates — safe |
| server-checkout.js | `adjust-pct` overlay | `manager-approval` | Could open overlay then interrupt — untested combo |
| close-day.js | Batch settlement overlay | `manager-approval` | Overlay + interrupt could coexist (different z-layers) |
| settings.js | None | None | ✅ Clean |
| payment.js | None | None | ✅ Clean |

---

## Acceptance Checklist

- [x] Every .js file in `/frontend/scenes/` examined (10 files)
- [x] Every `buildStyledButton` call inventoried (15 call sites)
- [x] Every async handler mapped for concurrency safety (10 handlers)
- [x] Every overlay/interrupt checked for stacking conflicts
- [x] Zero files modified (report only)
