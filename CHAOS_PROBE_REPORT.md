# KINDpos Chaos Integrity Probe Report

**Date:** 2026-04-06
**Branch:** `claude/kindpos-chaos-probe-XlGUn`
**Test suite:** 603 passed, 0 failures (pre-fix: 589)

---

## CRITICAL Findings

```
[CRITICAL] AV2.4 — Double Payment on Already-Paid Order
File:             backend/app/api/routes/orders.py (line 770)
Trigger:          Complete payment -> navigate back -> re-enter payment scene -> submit again
Observed:         initiate_payment accepts orders with status "paid" (guard was `not in ("open", "paid")`)
Expected:         Only orders with status "open" should accept new payments
Root Cause:       Status check included "paid" as an acceptable state for new payments
Fix Direction:    Change guard to `!= "open"` — paid orders must be rejected
Resolution:       FIXED — guard now rejects any status except "open"
Test:             test_paid_order_rejects_new_payment, test_double_payment_events_detectable
```

```
[CRITICAL] AV4.6 — Negative Tip Amount Accepted
File:             backend/app/api/routes/payment_routes.py (lines 374, 272)
Trigger:          POST /api/v1/payments/tip-adjust with tip_amount=-5.00
Observed:         Negative tip accepted, reduces batch settlement total, corrupts reconciliation
Expected:         Negative tips should be rejected at API boundary
Root Cause:       No >= 0 validation on tip_amount in adjust_tip or process_cash_payment
Fix Direction:    Add tip_amount < 0 guard at both endpoints (negative charges are refunds, per user)
Resolution:       FIXED — both adjust_tip and process_cash_payment reject negative tips
Test:             test_tip_adjust_request_rejects_negative, test_negative_tip_reduces_batch_total
```

---

## WARNING Findings

```
[WARNING] AV1.5 — Close Day Has No Async Guard
File:             frontend/js/scenes/close-day.js (line 925)
Trigger:          Tap CLOSE DAY button 3x in <500ms
Observed:         doCloseDay() fires fetch('/api/v1/orders/close-day') with no processing lock
Expected:         Only one close-day request should fire; subsequent taps ignored
Root Cause:       Missing async guard flag in doCloseDay()
Fix Direction:    Add _closeDayRunning flag, set before fetch, clear in .then/.catch
Resolution:       FIXED — _closeDayRunning flag prevents concurrent close-day requests
```

```
[WARNING] AV2.6 — Batch Settlement Accepts Zero Transactions
File:             backend/app/api/routes/orders.py (line ~1142)
Trigger:          POST /api/v1/orders/close-batch with no closed/paid orders
Observed:         Batch submitted event emitted with order_count=0 and all totals=0
Expected:         Empty batch should return early without emitting ledger events
Root Cause:       No check that all_order_ids is non-empty before emitting BATCH_SUBMITTED
Fix Direction:    Return {status: "no_transactions"} early if no orders to settle
Resolution:       FIXED — returns early with status "no_transactions" when no orders exist
Test:             test_batch_with_no_orders_produces_no_events
```

```
[WARNING] AV2.7 — Close Day Abandon Leaves Half-Closed State
File:             frontend/js/scenes/close-day.js (line 925-938)
Trigger:          Tap Close Day, navigate away >200ms later while fetch is in-flight
Observed:         pop() fires after async completion even if user has left the scene
Expected:         Navigation should be safe regardless of async completion timing
Root Cause:       doCloseDay had no guard; pop() could misfire. Combined with AV1.5.
Fix Direction:    _closeDayRunning guard (Fix 3) prevents the root issue
Resolution:       FIXED — same _closeDayRunning guard resolves this vector
```

```
[WARNING] AV3.1 — Empty Order Accepted by Backend Send
File:             backend/app/api/routes/orders.py (line ~1048)
Trigger:          POST /api/v1/orders/{id}/send on order with zero items
Observed:         Backend returns {sent_count: 0} success — no error raised
Expected:         Should reject with 400 "Cannot send order with no items"
Root Cause:       Backend only checked for unsent items, not for zero total items
Fix Direction:    Add guard: if not order.items, raise 400
Resolution:       FIXED — raises HTTPException 400 when order has no items
Test:             test_empty_order_has_no_items
```

```
[WARNING] AV3.6 — Quantity = 0 Accepted by Backend
File:             backend/app/api/routes/orders.py (line 86, 95)
Trigger:          POST /api/v1/orders/{id}/items with quantity=0
Observed:         Item added with qty=0, contributes $0 to subtotal but appears on order
Expected:         Quantity must be >= 1
Root Cause:       AddItemRequest.quantity had no Field constraint (just `int = 1`)
Fix Direction:    Use Field(default=1, ge=1) on both AddItemRequest and ModifyItemRequest
Resolution:       FIXED — Pydantic now rejects quantity < 1 at model validation
Test:             test_add_item_request_rejects_zero_quantity, test_add_item_request_rejects_negative_quantity, test_modify_item_request_rejects_zero_quantity
```

```
[WARNING] AV3.7 — Duplicate Modifier Stacking
File:             backend/app/core/projections.py (line ~256)
Trigger:          Apply same modifier (same modifier_id) twice to one item
Observed:         Modifier appended twice, price doubled
Expected:         Same modifier_id should not stack — second application ignored
Root Cause:       item.modifiers.append() with no duplicate check on modifier_id
Fix Direction:    Check if modifier_id already exists before appending
Resolution:       FIXED — projection skips append when modifier_id already present
Test:             test_duplicate_modifier_not_stacked, test_different_modifiers_both_applied
```

```
[WARNING] AV4.2 — 3+ Decimal Price Passes Precision Gate
File:             backend/app/core/event_ledger.py (line ~140) — DO NOT TOUCH
Trigger:          POST /api/v1/orders/{id}/items with price=10.125
Observed:         Precision gate warns in log but event is still appended
Expected:         Non-2dp monetary values should be hard-rejected
Root Cause:       Precision gate is warn-only, not enforcement
Fix Direction:    Since event_ledger.py is read-only, add _validate_2dp at API boundary
Resolution:       FIXED — _validate_2dp helper added to orders.py; applied to add_item (price, modifier_price) and initiate_payment (amount)
Test:             test_validate_2dp_rejects_3dp, test_validate_2dp_accepts_valid
```

---

## INFO Findings (Non-blocking)

```
[INFO] AV2.1 — Payment Scene Accepts Empty Params
File:             frontend/js/scenes/payment.js (line ~27)
Trigger:          Push to payment scene with no orderId or empty items
Observed:         Scene renders with empty receipt panel
Expected:         Guard at scene entry validates required params
Root Cause:       No validation of params on onEnter
Fix Direction:    Deferred — requires scene-manager change (read-only) or payment.js guard
```

```
[INFO] AV2.5 — Change-Due Nav-Away Leaves Order in "Paid" State
File:             frontend/js/scenes/change-due.js
Trigger:          Navigate away from change-due before countdown completes
Observed:         Order remains in "paid" status, not "closed"
Expected:         N/A — this is by design. Orders stay "paid" until close-day/close-batch
Root Cause:       Not a bug. Frontend never explicitly closes orders; close-day handles it.
Fix Direction:    No fix needed — architecture is correct
```

```
[INFO] AV3.8 — No Item Count Limit Per Order
File:             backend/app/api/routes/orders.py
Trigger:          Add 50+ items with modifiers to one order
Observed:         No hard limit; performance depends on event volume
Expected:         Could degrade UI rendering performance at extreme counts
Root Cause:       No item count limit enforced
Fix Direction:    Deferred — not a data integrity issue
```

```
[INFO] AV4.1 — No Item Name Length Limit
File:             backend/app/api/routes/orders.py (line 84)
Trigger:          Add item with 200+ character name
Observed:         Accepted without constraint; could overflow UI
Expected:         Reasonable max length
Root Cause:       name: str with no maxLength constraint
Fix Direction:    Deferred — cosmetic issue only
```

```
[INFO] AV5.3 — Two Print Jobs to Same Printer Back-to-Back
File:             backend/app/printing/print_dispatcher.py (line 87-90)
Trigger:          Two jobs queued for same printer in same poll cycle
Observed:         Processed sequentially; no true simultaneous send
Expected:         Sequential processing is correct for thermal printers
Root Cause:       N/A — sequential by design; socket is blocking sendall()
Fix Direction:    No fix needed
```

```
[INFO] AV6.2 — Cancelled Prefetch Renders Empty Scene
File:             frontend/js/scene-manager.js (line ~159) — DO NOT TOUCH
Trigger:          Navigate rapidly; prefetch cancelled mid-flight
Observed:         Scene renders without prefetched data
Expected:         Scene should handle missing prefetch gracefully
Root Cause:       Prefetch cancelled on new navigation (correct behavior)
Fix Direction:    Deferred — individual scenes should handle missing data
```

```
[INFO] AV6.5 — Reporting Shows Stale Data
File:             Frontend reporting scenes
Trigger:          View reporting while new order created from another session
Observed:         Report doesn't update until manual refresh
Expected:         Acceptable for POS — no real-time push requirement
Root Cause:       No WebSocket/SSE push for report invalidation
Fix Direction:    Deferred — not a data integrity issue
```

---

## SAFE — No Issues Found

| Vector | Check | Result |
|--------|-------|--------|
| AV1.1 | Tap CHARGE 3x <200ms | `confirmProcessing` flag in payment.js (line 25) |
| AV1.2 | Tap ADD ITEM during send | `isSending` flag in order-entry.js (line 37) |
| AV1.3 | Tap SEND + immediate nav | 200ms scene-manager debounce + isSending guard |
| AV1.4 | Tap TIP CONFIRM rapid | `_editCooldown` 200ms debounce in tip-adjustment.js |
| AV2.2 | Server-checkout, no servers | Empty card grid; `isBlocked()` prevents actions |
| AV2.3 | Tip-adjustment, no orders | Empty table rendered; harmless |
| AV3.2 | $0.00 total payment | `max(0.0, raw)` clamp in projections.py |
| AV3.3 | $0.00 tip entry | Zero tips accepted and recorded correctly |
| AV3.4 | Discount > subtotal | Clamped to $0.00; test_discount_exceeding_subtotal_clamped covers this |
| AV3.5 | 0% tip for all servers | Batch submits correctly with zero tips |
| AV4.3 | Modifier name with quotes/emoji | All SQLite queries use parameterized `?` placeholders |
| AV4.4 | Server name with apostrophe | Parameterized queries throughout |
| AV4.5 | Non-numeric tip via API | Pydantic validates `tip_amount: float` |
| AV5.1 | Kitchen printer offline | Retry schedule [0, 5, 15, 30] matches spec |
| AV5.2 | Kill printer mid-print | 5s socket timeout + retry + FAILED after 4 attempts |
| AV5.4 | Cash payment receipts | Customer only (line 846-847) |
| AV5.5 | Card payment receipts | Customer + merchant (line 847) |
| AV5.6 | 10 pending kitchen jobs | 3s poll; sequential drain stable |
| AV6.1 | 5 scenes in <2s | 200ms debounce in scene-manager.js |
| AV6.3 | Items persist across nav | Items are API-committed; survive navigation |
| AV6.4 | Interrupt overlay + back | dismissOverlay() cleanup in onExit |
| AV7.1 | Hash chain integrity | asyncio.Lock + compute_checksum(previous) verified |
| AV7.5 | correlation_id collision | uuid4.hex[:12] = ~48 bits; negligible at POS volume |
| AV7.7 | Entomology diagnostic | Separate system with own heartbeat cadence |

---

## Verification

- **Test suite:** 603 passed, 0 failures (was 589 pre-probe; +14 chaos probe tests)
- **Hash chain:** Verified intact via `ledger.verify_chain()` in test_hash_chain_integrity_after_operations
- **No do-not-touch files modified:** event_ledger.py, theme-manager.js, config.js, scene-manager.js, app.js, .db files all untouched

---

## Files Modified

| File | Fix |
|------|-----|
| `backend/app/api/routes/orders.py` | AV2.4 (payment guard), AV3.1 (empty send), AV3.6 (qty min), AV2.6 (batch zero), AV4.2 (2dp validation) |
| `backend/app/api/routes/payment_routes.py` | AV4.6 (negative tip reject) |
| `backend/app/core/projections.py` | AV3.7 (modifier dedup) |
| `frontend/js/scenes/close-day.js` | AV1.5 + AV2.7 (async guard) |
| `backend/tests/test_chaos_probe.py` | All new tests (14 tests) |
