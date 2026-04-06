# DEMO_BUG_AUDIT.md — KINDpos-lite Demo Branch Diagnostic Report

**Date:** 2026-04-06
**Branch:** `demo` (via `claude/demo-audit-seed-z03dJ`)
**Environment:** fly.dev, mock payment/printing/scanner backends, 1024x600 viewport

---

## Bug 1 — $0.00 Pricing

**Severity:** CRITICAL

**Files involved:**
- `frontend/js/scenes/order-entry.js` (lines 23, 32-94, 406-413)

**Root cause:**
`MENU_DATA` (lines 32-63) and `MOD_DATA` (lines 65-94) define menu items as **plain strings** (e.g., `'Classic'`, `'Cheese'`) with no price data attached. When an item is added to the ticket, `addToTicket()` (line 409) assigns `unitPrice: STUB_PRICE` where `STUB_PRICE = 10.00` (line 23). However, the tester screenshot shows $0.00 — this indicates either `STUB_PRICE` was previously zeroed or that items/modifiers are rendering with no price because the data objects lack a `price` field entirely.

Modifiers always get `price: 0` hardcoded at line 402:
```javascript
inst.mods.push({ name: modName, price: 0, charged: false });
```

The frontend never fetches from `GET /api/v1/menu` — all menu data is hardcoded inline.

**Impact:** All items display $0.00 (or $10.00 stub). Subtotal, tax, and total are either $0.00 or incorrect. Backend receives stub prices in order events.

---

## Bug 2 — Send → Payment Crash

**Severity:** CRITICAL

**Files involved:**
- `frontend/js/scenes/order-entry.js` (lines 691-748, 928-956)
- `frontend/js/scenes/receipt-review.js`
- `frontend/js/scenes/payment.js`

**Root cause:**
`handleSend()` wraps all API calls in a try/catch that **swallows errors** (lines 742-743: `console.warn` only). If the order creation or item posting fails, the error is silently logged and execution continues. `handlePay()` calls `await handleSend()` (line 933) but `handleSend` never re-throws, so `handlePay` proceeds to `push('receipt-review')` even when the backend call failed.

The payment flow itself (`receipt-review` → `payment` → `change-due`) is correctly wired. The crash manifests when:
1. `handleSend` fails silently but `currentOrderId` was already set (order created, items failed)
2. Or `currentOrderId` is null post-failure — line 936-938 catches this case but only logs a warning

Additionally, `receipt-review.js` line 291 uses `history.go(-1)` for the Back button, which can break the scene-manager navigation stack.

**Impact:** Tapping Send then Pay can result in a blank screen or unhandled promise rejection in the payment scene.

---

## Bug 3 — Clock In / Clock Out Broken

**Severity:** HIGH

**Files involved:**
- `frontend/js/scenes/login.js` (line 120)
- `backend/app/api/routes/staff.py` (lines 50-81)

**Root cause:**
The clock-in/out button renders on the login screen (line 35-40) and sets `selectedAction = 'clock'`. However, the `handlePinSubmit()` switch statement (line 120) has an **empty handler**:
```javascript
case 'clock': break;
```

No clock UI, no API call, no overlay — the button does nothing after PIN entry. The backend endpoints `POST /servers/clock-in` and `POST /servers/clock-out` exist and function correctly, but are never called.

**Impact:** Staff cannot clock in or out from the terminal.

---

## Bug 4 — Add Items Screen Disappears / Subcats Missing

**Severity:** MEDIUM

**Files involved:**
- `frontend/js/hex-nav.js` (lines 76-93, 181-235, 284-292)

**Root cause:**
The `placeChain()` function in hex-nav.js uses geometric hex-based placement. It tries to find collision-free positions for child hexes around their parent. When the SVG viewport is constrained (1024x600 minus ticket panel and button bars), the algorithm **silently drops items** that can't be placed:
```javascript
if (!pos) return;  // line 220 — item simply skipped
```

With `ITEM_R = 60` and 6-8 items per subcategory, the available space often can't fit all items. The user reports: "Combo item subcats shift and only show one at a time, sometimes missing a choice."

The `noCollision()` function (line 95-102) uses a tight 1.05x multiplier, leaving almost no tolerance for overlapping hexes.

**Impact:** Users can't see or select all menu items/subcategories. Items are silently missing from the display.

---

## Bug 5 — Void → Cancel Button Unresponsive

**Severity:** HIGH

**Files involved:**
- `frontend/js/scenes/order-entry.js` (lines 606-649, 654-689)

**Root cause:**
Two distinct failures:

1. **`VOID_REASONS` is undefined** (line 631). The variable is referenced in `showVoidReasons()` but **never declared anywhere** in the codebase. When the PIN is entered correctly and `showVoidReasons()` fires, it throws `ReferenceError: VOID_REASONS is not defined`. The interrupt is left in a broken state with no way to dismiss — the app appears frozen.

2. **Cancel button in PIN overlay works correctly** — `buildPinOverlay()` (line 681-686) creates a CANCEL button that calls `cb(false)` → `cancelInterrupt()`. This path functions. However, the broken void-reason flow (above) means users who enter a correct PIN get stuck, and may conflate this with "cancel not working."

**Impact:** Void flow crashes after correct PIN entry. App becomes unresponsive until page reload.

---

## Bug 6 (User-Reported) — Clock In Allowed Multiple Times

**Severity:** MEDIUM

**Files involved:**
- `backend/app/api/routes/staff.py` (lines 50-64)

**Root cause:**
`POST /servers/clock-in` appends a `USER_LOGGED_IN` event unconditionally — no check for whether the employee is already clocked in. The `GET /servers/clocked-in` endpoint correctly tracks state by replaying login/logout events, but the clock-in endpoint doesn't consult it.

**Impact:** Duplicate clock-in events pollute the event ledger. Time tracking reports will be inaccurate.

---

## Bug 7 (User-Reported) — Combo Subcats Shift / Missing Choices

**Severity:** MEDIUM

**Files involved:**
- `frontend/js/hex-nav.js` (same as Bug 4)

**Root cause:**
Same root cause as Bug 4. The hex placement algorithm's `placeChain()` function cannot reliably place all subcategory or item hexes in the available viewport. The `startFace` calculation (line 81) is deterministic per-hex but produces different layouts depending on the parent hex position, causing subcats to "shift" between navigations.

**Impact:** Subcategories appear in different positions or are missing entirely, making navigation unreliable.

---

## Bug 8 (User-Reported) �� Half Rack Added Twice

**Severity:** MEDIUM

**Files involved:**
- `frontend/js/hex-nav.js` (lines 162-172)

**Root cause:**
No debounce guard on `pointerup` → `onHexTap()`. The hex tap handler (line 166-168) fires on every `pointerup` event with no cooldown:
```javascript
g.addEventListener('pointerup', function() {
  g.setAttribute('transform', '');
  onHexTap(h);
});
```

A rapid double-tap adds two instances of the same item to the ticket.

**Impact:** Duplicate items added to orders, requiring manual void/delete.
