# KINDpos Sales Calculation Audit

**Date:** 2026-04-06
**Auditor:** Claude (automated)
**Scope:** All backend sales, tender, tip, and reconciliation calculations
**Modifications:** None — report only

---

## Phase 0 — File Map

| File | Relevant Functions / Properties |
|------|--------------------------------|
| `backend/app/core/money.py` | `money_round()` — central 2dp rounding via `Decimal` + `ROUND_HALF_UP` |
| `backend/app/core/projections.py` | `OrderItem.subtotal`, `Order.subtotal`, `Order.discount_total`, `Order.tax`, `Order.total`, `Order.amount_paid`, `Order.balance_due`, `project_order()`, `project_orders()` |
| `backend/app/core/events.py` | `payment_initiated()`, `payment_confirmed()`, `tip_adjusted()`, `batch_submitted()`, `day_closed()`, `cash_refund_due()` |
| `backend/app/api/routes/orders.py` | `get_day_summary()` (L346–567), `close_batch()` (L1074–1157), `close_day()` (L1164–1277) |
| `backend/app/api/routes/payment_routes.py` | `process_cash_payment()` (L265–352), `adjust_tip()` (L365–435), `process_refund()` (L499–561), `zero_unadjusted_tips()` (L438–484) |
| `backend/app/api/routes/reporting.py` | `_aggregate_orders()` (L56–154), `get_sales_summary()` (L200–339), `get_labor_summary()` (L344–613) |
| `backend/app/services/print_context_builder.py` | `build_server_checkout_context()` (L203–432), `build_sales_recap_context()` (L438–614) |
| `backend/app/printing/templates/sales_recap.py` | `_render_payment_breakdown()` — Cash Expected fallback formula (L147) |
| `backend/app/printing/templates/server_checkout.py` | `_render_cash_reconciliation()` — Cash Due formula (L270–326) |
| `backend/bombard/validators.py` | `validate_financial_reconciliation()`, `validate_ledger_integrity()` (2dp gate check), `validate_close_day()` |

---

## Phase 1 — Formula Deviations

### 1.1 Gross Sales

**Canonical:** `SUM(item.price × quantity) WHERE order is not voided`

**Implementation:** `Order.subtotal` (projections.py:91–93) sums `item.subtotal` for all items. `OrderItem.subtotal` (projections.py:38–41) computes `(price + modifier_total) * quantity`. Voided orders are excluded in all aggregation paths.

> **[INFO]** projections.py → `OrderItem.subtotal()` line 41
> Expected: `price × quantity`
> Found: `(price + modifier_total) × quantity`
> Impact: None — modifier inclusion is correct for POS; canonical formula was simplified. This is the **correct** real-world formula.

### 1.2 Net Sales

**Canonical:** `Gross Sales − discounts − voids − refunds − comps`

**Implementation (orders.py `get_day_summary` L512):**
```python
net_sales = float(gross_sales - void_total - discount_total)
```

> **[WARNING]** orders.py → `get_day_summary()` line 512
> Expected: `Gross − discounts − voids − refunds − comps`
> Found: `Gross − voids − discounts` (no separate comps or refunds deduction)
> Impact: Comps and refunds are not explicitly deducted. Comps would only appear if `ITEM_COMPED` events feed into `discount_total`, but the day-summary loop does NOT scan for `ITEM_COMPED` or `PAYMENT_REFUNDED` events — it only uses `order.discount_total` from the projection. Voids are tracked via `order.status == "voided"`. **Comps and refunds that don't flow through `DISCOUNT_APPROVED` events are silently missed.**

**Implementation (print_context_builder.py `build_server_checkout_context` L310):**
```python
net_sales = float(gross_sales - voids_total - comps_total - discounts_total)
```
This version correctly separates voids, comps, and discounts — but sources them from `ITEM_VOIDED`, `ITEM_COMPED`, and `DISCOUNT_APPLIED` event types, not from `DISCOUNT_APPROVED`.

> **[WARNING]** print_context_builder.py → `build_server_checkout_context()` line 310
> Expected: Deductions sourced from `DISCOUNT_APPROVED` events (which projections use)
> Found: Sources from `ITEM_VOIDED`, `ITEM_COMPED`, `DISCOUNT_APPLIED` event types
> Impact: Inconsistency between the projection's discount model (`DISCOUNT_APPROVED`) and the checkout context's deduction model (`DISCOUNT_APPLIED` + `ITEM_VOIDED` + `ITEM_COMPED`). If these event types are not consistently emitted, net sales will differ between the day-summary API and the printed checkout receipt.

**Implementation (reporting.py `_aggregate_orders` L139):**
```python
net_sales = gross_sales - void_total - discount_total
```

> **[WARNING]** reporting.py → `_aggregate_orders()` line 139
> Expected: `Gross − discounts − voids − comps − refunds`
> Found: `Gross − voids − discounts` (voids from voided orders' subtotal, discounts from `order.discount_total`)
> Impact: Same as orders.py — comps and refunds not separately tracked.

### 1.3 Taxable Sales / Tax Collected

**Canonical:** Tax Collected sourced from `payment.completed` events, NOT recalculated post-hoc.

**Implementation:** `Order.tax` (projections.py:108–111) is **recalculated** as:
```python
taxable = max(0.0, self.subtotal - self.discount_total)
return money_round(taxable * self.tax_rate)
```

> **[CRITICAL]** projections.py → `Order.tax` property, line 108–111
> Expected: Tax captured at payment time from event payload
> Found: Tax is recalculated post-hoc from `subtotal × tax_rate`
> Impact: If tax rate changes mid-day, previously closed orders will show the new rate when re-projected. There is no `tax` field stored in `PAYMENT_CONFIRMED` events. Tax is always derived, never captured at payment time. This violates the canonical requirement that tax is event-sourced.

### 1.4 Tender Breakdown

**Canonical:**
- `Cash Sales = SUM(payment.completed WHERE tender = 'cash')`
- `Card Sales = SUM(payment.completed WHERE tender = 'card')`
- Reconciliation: `Cash + Card = Net Sales + Tax Collected`

**Implementation:** All aggregation paths correctly filter by `p.method == "cash"` vs `p.method == "card"` on confirmed payments only. ✓

> **[WARNING]** No reconciliation check exists in any endpoint
> Expected: `Cash + Card == Net Sales + Tax` assertion or warning
> Found: No reconciliation validation anywhere in the codebase
> Impact: Tender splits that don't add up to the order total will silently pass. The bombard `validators.py` checks card/cash totals match between projections and day-summary, but does not check `Cash + Card == Net Sales + Tax`.

### 1.5 Tips

**Canonical:**
- `Tips Collected = SUM(tip.recorded)`
- `Card Tips = SUM(tip.recorded WHERE tender = 'card')`
- `Cash Tips = SUM(tip.recorded WHERE tender = 'cash')`

**Implementation (orders.py `get_day_summary`):** Uses `tip_map` (last-write-wins from `TIP_ADJUSTED` events) OR falls back to `p.tip_amount` on the payment object. Tips are attributed to cash/card based on the payment method of the associated payment. ✓

**Implementation (reporting.py `_aggregate_orders`):** Same pattern — `tip_map` with fallback to `p.tip_amount`. ✓

> **[INFO]** Tip attribution is correct. The `tip_map` last-write-wins pattern correctly handles re-adjustments.

### 1.6 Cash Expected (Server Checkout)

**Canonical:** `Cash Expected = Cash Sales − Card Tips`

**Implementation (print_context_builder.py `build_sales_recap_context` L606):**
```python
"cash_expected": money_round(float(cash_sales + cash_tips)),
```

> **[CRITICAL]** print_context_builder.py → `build_sales_recap_context()` line 606
> Expected: `Cash Expected = Cash Sales − Card Tips`
> Found: `Cash Expected = Cash Sales + Cash Tips`
> Impact: **Wrong formula.** The canonical formula accounts for the fact that card tips are paid out to servers from the cash drawer (reducing cash expected). This implementation instead adds cash tips to cash sales, which inflates the expected amount. The server checkout template (server_checkout.py L293) uses a different (also non-canonical) formula for "Cash Due" that does its own tip math.

**Implementation (sales_recap.py template L147):**
```python
cash_expected = ctx.get('cash_expected', cash_sales + ctx.get('cash_tips', 0.0))
```

> **[CRITICAL]** sales_recap.py → `_render_payment_breakdown()` line 147
> Expected: Fallback formula `Cash Sales − Card Tips`
> Found: Fallback formula `Cash Sales + Cash Tips`
> Impact: Same wrong formula as the context builder. If context doesn't provide `cash_expected`, the fallback is also wrong.

**Implementation (server_checkout.py `_render_cash_reconciliation` L293–295):**
```python
cash_due = cash_collected - declared_cash_tips + total_tip_out
if cc_tips_payout == 'cash' and not tip_pool:
    cash_due -= cc_tips_total
```

> **[INFO]** server_checkout.py → `_render_cash_reconciliation()` lines 293–295
> This is a more complex formula than the canonical `Cash Expected`, accounting for declared cash tips and tip-out. The CC tips deduction is conditional on `cc_tips_payout == 'cash'`. This is a valid business variant but diverges from the simple canonical formula.

### 1.7 Tip-Out

**Canonical:**
- `Tip-Out Amount = Tips Collected × Tip-Out %`
- `Server Net = Tips Collected − Tip-Out Amount`
- Tip-Out % must be runtime-configurable, not hardcoded

**Implementation (reporting.py `get_sales_summary` L311–315):**
```python
tipout_rate = 0.02  # 2% tipout — matches labor-summary tipout_percent
tipout = money_round(card_t * tipout_rate)
```

> **[CRITICAL]** reporting.py → `get_sales_summary()` line 311
> Expected: `Tip-Out = Tips Collected × configurable %`
> Found: `Tip-Out = Card Tips Only × hardcoded 2%`
> Impact: (1) Rate is hardcoded, not configurable. (2) Tip-out is calculated on card tips only, not total tips collected. (3) The comment says "2% tipout" but the canonical formula applies to ALL tips.

**Implementation (reporting.py `get_labor_summary` L546–547):**
```python
tipout_percent = 2
tipout_deducted = money_round(float(card_tips_total) * tipout_percent / 100)
```

> **[CRITICAL]** reporting.py → `get_labor_summary()` line 546–547
> Expected: Configurable tip-out percentage
> Found: Hardcoded `tipout_percent = 2`
> Impact: Not runtime-configurable. Also computed on card tips only.

**Implementation (print_context_builder.py L342–384):**
```python
tip_out_presets = getattr(settings, "tip_out_presets", [])
```

> **[INFO]** print_context_builder.py → `build_server_checkout_context()` line 342
> This implementation correctly reads from `settings.tip_out_presets` (runtime-configurable). However, `tip_out_presets` is NOT defined in `config.py` Settings class, so `getattr(..., [])` always returns `[]`, making tip-out effectively zero on the printed checkout unless settings are extended.

### 1.8 Batch Settlement

**Canonical:** `Settlement Amt = Card Sales + Card Tips`

**Implementation (orders.py `close_batch` L1107–1127):**
```python
batch_total += Decimal(str(order.total))  # uses order.total (includes tax)
for p in order.payments:
    if p.method == "cash":
        batch_cash += Decimal(str(p.amount))
    else:
        batch_card += Decimal(str(p.amount))
```

> **[WARNING]** orders.py → `close_batch()` lines 1111–1127
> Expected: `Batch Settlement = Card Sales + Card Tips`
> Found: `batch_card = SUM(card payment amounts)` — tips are NOT included in the batch settlement total
> Impact: Card tips are not added to the settlement amount. The `batch_submitted` event stores `total_amount` (all payments), `cash_total`, `card_total` — but none of these include tip amounts. The actual processor settlement should include tips.

### 1.9 Close Day Over/Short

**Canonical:** `Over/Short = Actual Cash Counted − Cash Expected`

> **[WARNING]** No Over/Short calculation exists anywhere in the backend
> Expected: An endpoint or function computing Over/Short from actual cash count vs expected
> Found: Nothing. The `close_day()` endpoint (orders.py L1164) stores a summary but never accepts an "actual cash counted" input and never computes Over/Short.
> Impact: Over/Short reconciliation is not implemented.

---

## Phase 2 — Precision Gate Findings

### 2.1 Central Rounding Function

`money_round()` in `backend/app/core/money.py` (lines 18–24):
```python
def money_round(value: float | int) -> float:
    return float(Decimal(str(value)).quantize(_TWO_DP, rounding=ROUND_HALF_UP))
```

> **[INFO]** money.py → `money_round()` line 24
> Correctly uses `Decimal(str(value))` to avoid IEEE 754 errors. Returns `float`, which is acceptable for final output. ROUND_HALF_UP matches industry standard. ✓

### 2.2 Intermediate Rounding

> **[CRITICAL]** projections.py → `OrderItem.subtotal` line 41
> ```python
> return money_round((self.price + modifier_total) * self.quantity)
> ```
> This rounds **each item's subtotal** individually. When summed in `Order.subtotal` (line 93), the result is rounded again:
> ```python
> return money_round(sum(item.subtotal for item in self.items))
> ```
> **Double rounding** — each item is rounded, then the sum is rounded. This can cause ±$0.01 drift per item.

> **[CRITICAL]** projections.py → `Order.tax` line 111
> ```python
> return money_round(taxable * self.tax_rate)
> ```
> Tax is rounded after applying the rate. But `taxable` is itself the result of a subtraction of two already-rounded values (`subtotal` and `discount_total`). **Triple rounding** path: item subtotals → order subtotal → discount subtotal → taxable → tax.

> **[CRITICAL]** projections.py → `Order.total` line 117
> ```python
> return money_round(max(0.0, raw))
> ```
> Where `raw = self.subtotal - self.discount_total + self.tax`. All three operands are already rounded. **Quadruple rounding** for the final total.

### 2.3 Float vs Decimal Usage

> **[WARNING]** projections.py → `OrderItem.price`, `Payment.amount`, `Payment.tip_amount`
> All monetary fields in the `OrderItem`, `Payment`, and `Order` dataclasses are typed as `float`. While `money_round` converts through `Decimal` for rounding, all intermediate arithmetic (`self.price + modifier_total`, `self.subtotal - self.discount_total + self.tax`) is done in **native float**.

> **[INFO]** reporting.py, orders.py, print_context_builder.py
> All aggregation logic in these files correctly uses `Decimal` accumulators (`_ZERO = Decimal("0")`). Conversion to float happens only at final output via `money_round(float(...))`. ✓

> **[INFO]** money.py
> Uses `Decimal` internally. ✓

> **[WARNING]** projections.py → `Order.tax` line 110–111
> ```python
> taxable = max(0.0, self.subtotal - self.discount_total)
> return money_round(taxable * self.tax_rate)
> ```
> `self.subtotal`, `self.discount_total`, and `self.tax_rate` are all `float`. The multiplication `taxable * self.tax_rate` is float arithmetic. For typical POS amounts this is unlikely to cause visible drift, but violates the "no float arithmetic" requirement.

### 2.4 Bombard 2dp Gate Validation

> **[INFO]** bombard/validators.py → `validate_ledger_integrity()` lines 80–96
> The bombard validator checks every monetary field in every event payload for 2dp compliance. This is a post-hoc check and correctly validates that all stored values are 2dp-clean. ✓

---

## Phase 3 — Reconciliation Cross-Check

No test database or fixtures are available in the runtime environment. All checks below are based on static code analysis.

### Check 1: Cash + Card = Net Sales + Tax Collected

> **[UNTESTABLE]** No test data available.
> **Code Analysis:** No reconciliation assertion exists in the codebase. The `close_batch()` and `close_day()` functions compute cash/card totals from payment amounts and total sales from `order.total`, but never assert they reconcile. Furthermore, `order.total` includes tax (computed as `subtotal - discount + tax`), while cash+card sums payment amounts only — these should be equal if all orders are fully paid, but the system doesn't enforce or verify this.

### Check 2: Tips Collected = Card Tips + Cash Tips

> **[UNTESTABLE]** No test data available.
> **Code Analysis:** In all aggregation paths, tips are partitioned by `p.method` into cash_tips and card_tips, and `total_tips` is the sum of both. The partition is exhaustive (all confirmed payments are either cash or card). **No orphaned tip events possible in the current code path.** ✓ (by construction)

### Check 3: Cash Expected = Cash Sales − Card Tips

> **[FAIL]** (by code analysis)
> The implementation uses `Cash Expected = Cash Sales + Cash Tips` (print_context_builder.py L606), which is the **wrong formula**. See Phase 1, Finding 1.6.

### Check 4: Batch Settlement = Card Sales + Card Tips

> **[FAIL]** (by code analysis)
> The batch settlement (`close_batch()` in orders.py) computes `batch_card` from payment amounts only. Card tips from `TIP_ADJUSTED` events are NOT included. See Phase 1, Finding 1.8.

---

## Summary

### Finding Counts

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| WARNING | 5 |
| INFO | 6 |

### Critical Findings

1. **Tax recalculated post-hoc** — projections.py `Order.tax` derives tax from rate × subtotal instead of capturing from payment events
2. **Cash Expected formula wrong** — print_context_builder.py L606 uses `Cash Sales + Cash Tips` instead of `Cash Sales − Card Tips`
3. **Cash Expected fallback wrong** — sales_recap.py L147 same wrong formula
4. **Tip-out rate hardcoded** — reporting.py L311 and L546 hardcode 2%, not configurable
5. **Intermediate rounding** — projections.py rounds at item, subtotal, tax, and total levels (quadruple rounding path)
6. **Tip-out basis wrong** — reporting.py computes tip-out on card tips only, not total tips

### Reconciliation Results

| Check | Result |
|-------|--------|
| Cash + Card = Net Sales + Tax | UNTESTABLE (no data, no assertion in code) |
| Tips = Card Tips + Cash Tips | PASS (by construction) |
| Cash Expected = Cash Sales − Card Tips | **FAIL** (wrong formula) |
| Batch Settlement = Card Sales + Card Tips | **FAIL** (tips not included) |

### Recommended Fix Order

1. **Cash Expected formula** (CRITICAL) — Change `cash_sales + cash_tips` → `cash_sales - card_tips` in print_context_builder.py L606 and sales_recap.py L147 fallback
2. **Batch Settlement** (WARNING→CRITICAL) — Include card tips in batch settlement amount in `close_batch()` 
3. **Tax from events** (CRITICAL) — Add `tax` field to `PAYMENT_CONFIRMED` event payload; use captured value instead of recalculating
4. **Tip-out configurability** (CRITICAL) — Add `tipout_percent` to `Settings` class in config.py; replace hardcoded `0.02` / `2` in reporting.py
5. **Tip-out basis** (CRITICAL) — Apply tip-out to total tips, not card-only
6. **Intermediate rounding** (CRITICAL) — Delay `money_round()` in `OrderItem.subtotal` and `Order.subtotal`; round only at `Order.total`
7. **Float fields in projections** (WARNING) — Consider using `Decimal` for `OrderItem.price`, `Payment.amount`, `Payment.tip_amount`
8. **Reconciliation assertion** (WARNING) — Add `Cash + Card == Net Sales + Tax` check to `close_batch()` and `close_day()`
9. **Net Sales consistency** (WARNING) — Unify deduction model across orders.py, reporting.py, and print_context_builder.py (comps/refunds)
10. **Over/Short** (WARNING) — Implement actual cash count input and Over/Short calculation

---

## Acceptance Criteria Checklist

- [x] Every canonical formula has a corresponding backend location mapped
- [x] Cash Expected formula verified: **FAIL — uses `Cash Sales + Cash Tips` instead of `Cash Sales − Card Tips`**
- [x] Tax Collected sourced from events, not recalculated: **FAIL — recalculated from `subtotal × rate`**
- [x] 2dp gate uses Decimal (not float) throughout: **PARTIAL — aggregation uses Decimal, but projections use float fields with intermediate rounding**
- [x] Tender reconciliation check documented: **UNTESTABLE (no data) / no assertion in code**
- [x] No modifications made to any file
- [x] SALES_CALC_AUDIT.md written with all findings
