# KINDpos Event Ledger Audit Report

**Date:** 2026-04-06 (re-audit after main merge)
**Scope:** All event types written to the immutable SHA-256 hash-chained SQLite ledger
**Status:** Re-audit complete. Prior Phase 2 fixes verified. New changes reviewed.

---

## Executive Summary

This is a re-audit following the merge of the initial audit branch into main, plus 9 subsequent commits that introduced tax-at-payment-time capture, precision improvements, and reporting changes. The prior Phase 2 fixes (ephemeral log, enum pruning, projection gaps, bug fixes) are **intact and correctly applied**. Three new findings from the post-merge changes are documented below.

---

## PHASE 0 — Inventory (Current State)

### 0.1 — Event Type Census

**75 EventType enum values** across 3 classifications:

| Classification | Count | Description |
|---|---|---|
| LEDGER_CORE | 21 | Financial source-of-truth events (orders, payments, tips, batches) |
| LEDGER_OPERATIONAL | 41 | Configuration, menu, employee, hardware registration events |
| EPHEMERAL | 13 | Telemetry routed to non-chained EphemeralLog |

#### Order Lifecycle (LEDGER_CORE)

| event_type | Emitted | Consumed | Status |
|---|---|---|---|
| ORDER_CREATED | `orders.py:270` | `projections.py`, `orders.py`, `reporting.py`, `print_context_builder.py` | OK |
| ORDER_CLOSED | `orders.py`, `payment_routes.py` | `projections.py`, `print_context_builder.py` | OK |
| ORDER_REOPENED | `orders.py` | `projections.py` | OK |
| ORDER_VOIDED | `orders.py` | `projections.py` | OK |

#### Item Management (LEDGER_CORE)

| event_type | Emitted | Consumed | Status |
|---|---|---|---|
| ITEM_ADDED | `orders.py` | `projections.py` | OK |
| ITEM_REMOVED | `orders.py` | `projections.py` | OK |
| ITEM_MODIFIED | `orders.py` | `projections.py` | OK |
| ITEM_SENT | `orders.py` | `projections.py` | OK |
| MODIFIER_APPLIED | `orders.py` | `projections.py` | OK |

#### Discounts (LEDGER_CORE)

| event_type | Emitted | Consumed | Status |
|---|---|---|---|
| DISCOUNT_APPROVED | `orders.py`, `payment_routes.py` | `projections.py`, `print_context_builder.py` (via projection) | OK |

#### Payments (LEDGER_CORE)

| event_type | Emitted | Consumed | Status |
|---|---|---|---|
| PAYMENT_INITIATED | `payment_manager.py`, `payment_routes.py` | `projections.py` | OK |
| PAYMENT_CONFIRMED | `payment_manager.py`, `orders.py` | `projections.py` (captures tax_amount) | OK |
| PAYMENT_DECLINED | `payment_manager.py` | `projections.py` → status="failed" | OK |
| PAYMENT_CANCELLED | `payment_manager.py` | `projections.py` → status="failed" | OK |
| PAYMENT_TIMED_OUT | `payment_manager.py` | `projections.py` → status="failed" | OK |
| PAYMENT_ERROR | `payment_manager.py` | `projections.py` → status="failed" | OK |

#### Post-Authorization (LEDGER_CORE)

| event_type | Emitted | Consumed | Status |
|---|---|---|---|
| PAYMENT_REFUNDED | `orders.py` | `projections.py` | OK |
| TIP_ADJUSTED | `payment_routes.py` | `projections.py`, `orders.py`, `reporting.py`, `print_context_builder.py` | OK |
| CASH_TIPS_DECLARED | `staff.py` | `print_context_builder.py` | OK (has correlation_id) |

#### Batch / Day (LEDGER_CORE)

| event_type | Emitted | Consumed | Status |
|---|---|---|---|
| BATCH_SUBMITTED | `orders.py` (close_batch + close_day) | `bombard/validators.py` | OK |
| DAY_CLOSED | `orders.py` (close_day) | `bombard/validators.py` | OK |

#### Printing (LEDGER_OPERATIONAL + EPHEMERAL)

| event_type | Classification | Destination | Status |
|---|---|---|---|
| TICKET_PRINTED | LEDGER_OPERATIONAL | Ledger | OK — consumed by `projections.py` |
| TICKET_REPRINTED | LEDGER_OPERATIONAL | Ledger | OK — reprint audit trail |
| PRINTER_REGISTERED | LEDGER_OPERATIONAL | Ledger | OK — consumed by `overseer_config_service.py` |
| TICKET_PRINT_FAILED | EPHEMERAL | EphemeralLog | OK |
| PRINT_RETRYING | EPHEMERAL | EphemeralLog | OK |
| PRINT_REROUTED | EPHEMERAL | EphemeralLog | OK |
| PRINTER_STATUS_CHANGED | EPHEMERAL | EphemeralLog | OK |
| PRINTER_ERROR | EPHEMERAL | EphemeralLog | OK |
| PRINTER_ROLE_CREATED | EPHEMERAL | EphemeralLog | OK |
| PRINTER_FALLBACK_ASSIGNED | EPHEMERAL | EphemeralLog | OK |
| PRINTER_HEALTH_WARNING | EPHEMERAL | EphemeralLog | OK |
| PRINTER_REBOOT_STARTED | EPHEMERAL | EphemeralLog | OK |
| PRINTER_REBOOT_COMPLETED | EPHEMERAL | EphemeralLog | OK |
| DRAWER_OPENED | EPHEMERAL | EphemeralLog | OK |
| DRAWER_OPEN_FAILED | EPHEMERAL | EphemeralLog | OK |
| DEVICE_STATUS_CHANGED | EPHEMERAL | EphemeralLog | OK |

#### Store Configuration (LEDGER_OPERATIONAL) — 8 types

All STORE_* events emitted by `config.py`, consumed by `store_config_service.py`. **OK.**

#### Employee & Roles (LEDGER_OPERATIONAL) — 9 types

All EMPLOYEE_*, TIPOUT_* events emitted by `config.py`, consumed by `overseer_config_service.py`. **OK.**

#### Menu Management (LEDGER_OPERATIONAL) — 11 types

All MENU_*, MODIFIER_GROUP_* events emitted by `config.py`, consumed by `menu_projection.py` and `overseer_config_service.py`. **OK.**

#### Batch Setup (LEDGER_OPERATIONAL) — 4 types

RESTAURANT_CONFIGURED, TAX_RULES_BATCH_CREATED, CATEGORIES_BATCH_CREATED, ITEMS_BATCH_CREATED emitted by `config.py`, consumed by `menu_projection.py`. **OK.**

#### Floor Plan (LEDGER_OPERATIONAL) — 4 types

All FLOORPLAN_* events emitted by `config.py`, consumed by `overseer_config_service.py`. **OK.**

#### Hardware (LEDGER_OPERATIONAL) — 3 types

TERMINAL_REGISTERED, TERMINAL_UPDATED, ROUTING_MATRIX_UPDATED emitted by `config.py`, consumed by `overseer_config_service.py`. **OK.**

#### System (LEDGER_OPERATIONAL) — 2 types

USER_LOGGED_IN, USER_LOGGED_OUT emitted by `config.py`, consumed by `reporting.py`, `print_context_builder.py`. **OK.**

---

### 0.2 — Emit/Consume Coverage

| Metric | Count |
|---|---|
| Total EventType enum values | 75 |
| With at least one emitter | 75 |
| With at least one consumer | 62 |
| Emitter + consumer (fully wired) | 62 |
| Emitter only (no consumer) | 13 (all EPHEMERAL — telemetry by design) |
| Dead (no emitter, no consumer) | 0 |
| Factory functions | 34 |
| Event types without factory (use `create_event` directly) | 41 (config/setup events — normal) |

**Status: Clean.** Zero dead types. All non-consumed types are intentionally ephemeral.

---

### 0.3 — Changes Since Prior Audit

Nine commits landed on main between the audit merge and this re-audit. Key changes:

1. **Tax-at-payment-time** (`projections.py`, `payment_manager.py`, `events.py`, `orders.py`)
   - `payment_confirmed()` factory now accepts `tax: float = 0.0`
   - `Payment` dataclass gained `tax_amount` field
   - `project_order()` captures `tax` from PAYMENT_CONFIRMED payload
   - `Order.tax` property now prefers event-sourced tax from confirmed payments, falls back to computed tax
   - `PaymentManager.initiate_sale()` stashes tax via `self._pending_tax` and includes it in result event
   - `confirm_payment()` route passes `order.tax` to `payment_confirmed()`

2. **Precision improvements** (`projections.py`, `orders.py`)
   - `OrderItem.subtotal` no longer rounds intermediately — rounding deferred to `Order.subtotal`
   - `OrderResponse.from_order()` applies `money_round()` at the API boundary
   - `Order.amount_paid` and `Order.discount_total` properties documented as rounded

3. **Batch close / Day close** (`orders.py`)
   - `close_batch()` and `close_day()` now build a `tip_map` (last-write-wins per payment_id)
   - Card settlement = card sales + card tips (not just card sales)
   - Tender reconciliation check added with logger.warning on mismatch > $0.01
   - `close_day()` accepts optional `actual_cash_counted` for Over/Short computation
   - `cash_expected` formula: cash sales − card tips

4. **Print context** (`print_context_builder.py`)
   - Switched from event-level discount aggregation to `order.discount_total` (projection-consistent)
   - Removed `voids_total` and `comps_total` from net_sales formula
   - `cash_expected` formula: cash sales − card tips (matches close_day)

---

## PHASE 1 — Severity-Ranked Findings

### Prior findings status: ALL RESOLVED

All 17 findings from the initial audit (5 CRITICAL, 7 WARNING, 5 INFO) remain resolved:
- **C1-C4**: Ephemeral log active, 13 event types routed correctly
- **C5**: `EMPLOYEE_REGISTERED` → `EMPLOYEE_CREATED` fix intact at `config.py:198`
- **W1**: BATCH_CLOSED removed (no longer in enum)
- **W2-W6**: Ephemeral routing intact in `printer_manager.py` and `payment_health.py`
- **W7**: `correlation_id` on CASH_TIPS_DECLARED intact in `staff.py`
- **I1**: Enum pruned from 91 → 75 (was 42 after aggressive prune; 33 config/setup types re-added via main commits). All active.
- **I2**: Projection handles PAYMENT_DECLINED/CANCELLED/TIMED_OUT/ERROR → status="failed"
- **I3-I5**: Unchanged, acceptable.

### New Findings (Post-Merge)

| # | Severity | Finding | File + Line | Detail |
|---|---|---|---|---|
| N1 | **WARNING** | `_pending_tax` instance variable race | `payment_manager.py:57` | `initiate_sale()` stashes `tax` as `self._pending_tax` then awaits `device.initiate_sale()` (up to 90s). If two concurrent sales run on the same PaymentManager instance, the second call overwrites `_pending_tax` before the first completes. Tax will be misattributed. Should pass `tax` through the call chain or use a dict keyed by transaction_id. |
| N2 | **WARNING** | `from ..money import money_round` inside method body | `payment_manager.py:101` | Import statement inside `initiate_sale()`. Should be at module top. Not a correctness issue but causes repeated import overhead and violates project conventions. |
| N3 | **INFO** | `Order.tax` dual-path may diverge | `projections.py:110-115` | `Order.tax` prefers event-sourced tax (`sum of payment.tax_amount`) but falls back to computed `taxable * tax_rate` when no confirmed payment exists. If the tax rate changes between order creation and payment, the fallback and captured values could differ. This is by design (captured tax is the truth after payment), but worth noting for debugging. |

---

### Finding Summary

| Severity | Prior (resolved) | New | Total Active |
|---|---|---|---|
| CRITICAL | 5 | 0 | **0** |
| WARNING | 7 | 2 | **2** |
| INFO | 5 | 1 | **1** |
| **Total** | **17** | **3** | **3** |

---

## PHASE 2 — Prior Resolutions (Verified Intact)

| Finding | Resolution | Verified |
|---|---|---|
| **C1-C4** | `EphemeralLog` at `backend/app/core/ephemeral_log.py`. 13 event types routed to non-chained SQLite via `printer_manager.py` and `payment_health.py`. | YES |
| **C5** | `EMPLOYEE_REGISTERED` → `EMPLOYEE_CREATED` at `config.py:198`. | YES |
| **W1** | `BATCH_CLOSED` removed from enum and emission. | YES |
| **W2-W6** | All printer/drawer ephemeral events use `self._ephemeral.append()`. | YES |
| **W7** | `correlation_id=server_id` on `CASH_TIPS_DECLARED` at `staff.py`. | YES |
| **I1** | Enum pruned. No dead types remain. | YES |
| **I2** | Projection handles all failure payment states → `status="failed"`. | YES |
| **A6** | `print_context_builder.py` uses `order.discount_total` via projection (no more DISCOUNT_APPLIED/ITEM_VOIDED/ITEM_COMPED dead reads). | YES |

---

## Hash Chain Health

| Metric | Before Audit | After Audit |
|---|---|---|
| EventType enum values | 91 | 75 |
| Types routed to immutable chain | 91 | 62 |
| Types routed to ephemeral log | 0 | 13 |
| Dead types (no emit, no consume) | 49 | 0 |
| Projection gaps | 4 (PAYMENT_CANCELLED/TIMED_OUT/ERROR, failure states) | 0 |
| Runtime crash bugs | 1 (EMPLOYEE_REGISTERED) | 0 |

**All 589 tests pass.**
