# KINDpos Event Ledger Audit Report

**Date:** 2026-04-06
**Scope:** All event types written to the immutable SHA-256 hash-chained SQLite ledger
**Status:** Phase 0 + Phase 1 complete. Awaiting approval before any modifications.

---

## PHASE 0 — Inventory

### 0.1 — Event Type Census

Every unique `EventType` enum value from `backend/app/core/events.py:28-207`, cross-referenced with all production emit sites and downstream consumers.

**Legend — Emitted:** file that calls `ledger.append()` with this type. **Consumed:** file that queries/filters on this type.

#### Order Lifecycle

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| ORDER_CREATED | `ORDER_CREATED` | `orders.py:284` | `projections.py`, `orders.py`, `reporting.py`, `print_context_builder.py` | order_id, check_number, table, server_id, server_name, order_type, guest_count, customer_name | per-order |
| ORDER_CLOSED | `ORDER_CLOSED` | `orders.py:846,1093,1184`, `payment_routes.py:248,344` | `projections.py`, `orders.py` | order_id, total | per-order |
| ORDER_REOPENED | `ORDER_REOPENED` | `orders.py:876` | `projections.py` | order_id | rare |
| ORDER_VOIDED | `ORDER_VOIDED` | `orders.py:960,1104,1193` | `projections.py` | order_id, reason, approved_by | rare |
| ORDER_TYPE_CHANGED | `ORDER_TYPE_CHANGED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Item Management

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| ITEM_ADDED | `ITEM_ADDED` | `orders.py:626` | `projections.py` | order_id, item_id, menu_item_id, name, price, quantity, category, notes, seat_number | per-item |
| ITEM_REMOVED | `ITEM_REMOVED` | `orders.py:675` | `projections.py` | order_id, item_id, reason | per-removal |
| ITEM_MODIFIED | `ITEM_MODIFIED` | `orders.py:712` | `projections.py` | order_id, item_id, quantity, price, notes | per-modification |
| ITEM_SENT | `ITEM_SENT` | `orders.py:1059` | `projections.py` | order_id, item_id, name, seat_number, category, sent_at | per-item-per-send |
| ITEM_VOIDED | `ITEM_VOIDED` | **NEVER EMITTED** | `print_context_builder.py` (read but never written) | — | — |
| ITEM_COMPED | `ITEM_COMPED` | **NEVER EMITTED** | `print_context_builder.py` (read but never written) | — | — |
| MODIFIER_APPLIED | `MODIFIER_APPLIED` | `orders.py:639,749` | `projections.py` | order_id, item_id, modifier_id, modifier_name, modifier_price, action | per-modifier |

#### Discounts

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| DISCOUNT_REQUESTED | `DISCOUNT_REQUESTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DISCOUNT_APPROVED | `DISCOUNT_APPROVED` | `orders.py:1005`, `payment_routes.py:295` | `projections.py` | order_id, discount_type, amount, reason, approved_by, item_ids | per-discount |
| DISCOUNT_REJECTED | `DISCOUNT_REJECTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DISCOUNT_APPLIED | `DISCOUNT_APPLIED` | **NEVER EMITTED** | `print_context_builder.py:277,528` (dead read) | — | — |

#### Printing

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| TICKET_PRINTED | `TICKET_PRINTED` | `printer_manager.py:501,667` | `projections.py` | order_id, printer_id, printer_name, ticket_type, job_id | per-print-job |
| TICKET_PRINT_FAILED | `TICKET_PRINT_FAILED` | `printer_manager.py:454,538,709` | **NEVER CONSUMED** | order_id, printer_id, error, will_retry | per-failure |
| TICKET_REPRINTED | `TICKET_REPRINTED` | `printer_manager.py:472` | **NEVER CONSUMED** | order_id, printer_id, printer_name, original_job_id, ticket_type | rare |
| RECEIPT_PRINTED | `RECEIPT_PRINTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| RECEIPT_REPRINTED | `RECEIPT_REPRINTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINT_JOB_QUEUED | `PRINT_JOB_QUEUED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINT_JOB_SENT | `PRINT_JOB_SENT` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINT_JOB_COMPLETED | `PRINT_JOB_COMPLETED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINT_JOB_FAILED | `PRINT_JOB_FAILED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINT_JOB_RETRIED | `PRINT_JOB_RETRIED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINT_RETRYING | `PRINT_RETRYING` | `printer_manager.py:522` | **NEVER CONSUMED** | order_id, printer_id, job_id, retry_count, error | per-retry-attempt |
| PRINT_REROUTED | `PRINT_REROUTED` | `printer_manager.py:646` | **NEVER CONSUMED** | order_id, job_id, original_printer_id, rerouted_to_printer_id, reason, fallback_tier | per-reroute |

#### Delivery

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| DELIVERY_INFO_ADDED | `DELIVERY_INFO_ADDED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DRIVER_ASSIGNED | `DRIVER_ASSIGNED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DELIVERY_DISPATCHED | `DELIVERY_DISPATCHED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DELIVERY_COMPLETED | `DELIVERY_COMPLETED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Printer Lifecycle

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| PRINTER_REGISTERED | `PRINTER_REGISTERED` | `printer_manager.py:151` | `overseer_config_service.py` | printer_id, printer_name, printer_type, connection_string, role, discovered_via | per-printer-setup |
| PRINTER_STATUS_CHANGED | `PRINTER_STATUS_CHANGED` | `printer_manager.py:763` | **NEVER CONSUMED** | printer_id, printer_name, previous_status, new_status | per-status-change (polling) |
| PRINTER_ERROR | `PRINTER_ERROR` | `printer_manager.py:876,897` | **NEVER CONSUMED** | printer_id, printer_name, error, requires_attention | per-alert |

#### Printer Configuration

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| PRINTER_ROLE_ASSIGNED | `PRINTER_ROLE_ASSIGNED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PRINTER_ROLE_CREATED | `PRINTER_ROLE_CREATED` | `printer_manager.py:215` | **NEVER CONSUMED** | role_name, created_by | per-role-setup |
| PRINTER_FALLBACK_ASSIGNED | `PRINTER_FALLBACK_ASSIGNED` | `printer_manager.py:258` | **NEVER CONSUMED** | printer_id, printer_name, fallback_printer_id, fallback_printer_name | per-fallback-setup |
| PRINTER_CONFIG_UPDATED | `PRINTER_CONFIG_UPDATED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| TEMPLATE_CONFIG_UPDATED | `TEMPLATE_CONFIG_UPDATED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Printer Maintenance

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| PRINTER_REBOOT_STARTED | `PRINTER_REBOOT_STARTED` | `printer_manager.py:804` | **NEVER CONSUMED** | printer_id, printer_name, reason | per-reboot |
| PRINTER_REBOOT_COMPLETED | `PRINTER_REBOOT_COMPLETED` | `printer_manager.py:819` | **NEVER CONSUMED** | printer_id, printer_name, duration_seconds | per-reboot |
| PRINTER_HEALTH_WARNING | `PRINTER_HEALTH_WARNING` | `printer_manager.py:779` | **NEVER CONSUMED** | printer_id, printer_name, warning_type, details | per-overheat |

#### Cash Drawer

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| DRAWER_OPENED | `DRAWER_OPENED` | `printer_manager.py:722` | **NEVER CONSUMED** | printer_id, reason, opened_by | per-cash-payment |
| DRAWER_OPEN_FAILED | `DRAWER_OPEN_FAILED` | `printer_manager.py:709,733` | **NEVER CONSUMED** | printer_id, error | per-failure |

#### Payment Device Lifecycle

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| PAYMENT_DEVICE_REGISTERED | `PAYMENT_DEVICE_REGISTERED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_DEVICE_CONNECTED | `PAYMENT_DEVICE_CONNECTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_DEVICE_DISCONNECTED | `PAYMENT_DEVICE_DISCONNECTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_DEVICE_ERROR | `PAYMENT_DEVICE_ERROR` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_DEVICE_REBOOTED | `PAYMENT_DEVICE_REBOOTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Payment Processing

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| PAYMENT_INITIATED | `payment.initiated` | `orders.py:779`, `payment_routes.py:311`, `payment_manager.py:73` | `projections.py` | order_id, payment_id, amount, method | per-payment |
| PAYMENT_WAITING | `PAYMENT_WAITING` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_PROCESSING | `PAYMENT_PROCESSING` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_APPROVED | `PAYMENT_APPROVED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_CONFIRMED | `payment.confirmed` | `orders.py:809`, `payment_routes.py:321`, `payment_manager.py:138` | `projections.py`, `payment_manager.py` (idempotency) | order_id, payment_id, transaction_id, amount | per-payment |
| PAYMENT_DECLINED | `payment.failed` | `payment_manager.py:138` | `projections.py`, `payment_manager.py` (idempotency) | order_id, payment_id, error | per-decline |
| PAYMENT_CANCELLED | `payment.cancelled` | `payment_manager.py:138` | **NEVER CONSUMED** | order_id, payment_id | rare |
| PAYMENT_TIMED_OUT | `payment.timeout` | `payment_manager.py:138` | **NEVER CONSUMED** | order_id, payment_id | rare |
| PAYMENT_ERROR | `PAYMENT_ERROR` | `payment_manager.py:138` | **NEVER CONSUMED** | order_id, payment_id, error | rare |
| PAYMENT_FAILED | `PAYMENT_FAILED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Post-Authorization

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| PAYMENT_CAPTURED | `PAYMENT_CAPTURED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_VOIDED | `payment.voided` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| PAYMENT_REFUNDED | `PAYMENT_REFUNDED` | `orders.py:952`, `payment_routes.py:552` | `payment_routes.py` | order_id, payment_id, amount, reason | per-refund |
| PAYMENT_REFUND_FAILED | `PAYMENT_REFUND_FAILED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| TIP_ADDED | `TIP_ADDED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| TIP_ADJUST_SENT | `TIP_ADJUST_SENT` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| TIP_ADJUST_CONFIRMED | `TIP_ADJUST_CONFIRMED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| TIP_ADJUST_FAILED | `TIP_ADJUST_FAILED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| TIP_ADJUSTED | `payment.tip_adjusted` | `payment_routes.py:331,404,481` | `projections.py`, `reporting.py`, `orders.py` | order_id, payment_id, tip_amount, previous_tip | per-tip-adjust |
| CASH_TIPS_DECLARED | `payment.cash_tips_declared` | `staff.py:149` | **NEVER CONSUMED** | server_id, amount | per-server-per-day |

#### Batch / Day

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| BATCH_CLOSED | `batch.closed` | `orders.py:1148` | **NEVER CONSUMED** | order_count | per-batch |
| BATCH_SUBMITTED | `batch.submitted` | `orders.py:1140,1245` | **NEVER CONSUMED** | order_count, total_amount, cash_total, card_total, order_ids | per-batch |
| DAY_CLOSED | `day.closed` | `orders.py:1261` | `orders.py` (day boundary), `reporting.py` | date, total_orders, total_sales, total_tips, cash_total, card_total, order_ids, payment_count, opened_at | per-day |

#### Device

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| DEVICE_STATUS_CHANGED | `device.status_changed` | `payment_health.py:82` | **NEVER CONSUMED** | device_id, old_status, new_status, timestamp | per-status-change (2s polling) |
| DEVICE_DISCOVERED | `device.discovered` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DEVICE_IP_CHANGED | `device.ip_changed` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| DEVICE_RESTORED | `device.restored` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Split Payments

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| SPLIT_STARTED | `SPLIT_STARTED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| SPLIT_PAYMENT_COMPLETED | `SPLIT_PAYMENT_COMPLETED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| SPLIT_COMPLETED | `SPLIT_COMPLETED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Idempotency

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| DUPLICATE_PAYMENT_BLOCKED | `DUPLICATE_PAYMENT_BLOCKED` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Store Configuration

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| STORE_INFO_UPDATED | `store.info_updated` | `config.py:88` | `store_config_service.py` | (StoreInfo model dump) | rare (setup) |
| STORE_CC_PROCESSING_RATE_UPDATED | `store.cc_processing_rate_updated` | `config.py:99` | `store_config_service.py` | (CCProcessingRate model dump) | rare |
| STORE_TAX_RULE_CREATED | `store.tax_rule_created` | `config.py:129` (batch push) | `store_config_service.py` | (tax rule payload) | rare |
| STORE_TAX_RULE_UPDATED | `store.tax_rule_updated` | `config.py:129` (batch push) | `store_config_service.py` | (tax rule payload) | rare |
| STORE_TAX_RULE_DELETED | `store.tax_rule_deleted` | `config.py:129` (batch push) | `store_config_service.py` | (tax rule id) | rare |
| STORE_OPERATING_HOURS_UPDATED | `store.operating_hours_updated` | `config.py:129` (batch push) | `store_config_service.py` | (hours payload) | rare |
| STORE_ORDER_TYPES_UPDATED | `store.order_types_updated` | `config.py:129` (batch push) | `store_config_service.py` | (order types payload) | rare |
| STORE_AUTO_GRATUITY_UPDATED | `store.auto_gratuity_updated` | `config.py:129` (batch push) | `store_config_service.py` | (gratuity payload) | rare |

#### Employee & Roles

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| EMPLOYEE_ROLE_CREATED | `employee.role_created` | `config.py:167` | `overseer_config_service.py` | (Role model dump) | rare |
| EMPLOYEE_ROLE_UPDATED | `employee.role_updated` | `config.py:178` | `overseer_config_service.py` | (Role model dump) | rare |
| EMPLOYEE_ROLE_DELETED | `employee.role_deleted` | `config.py:189` | `overseer_config_service.py` | role_id | rare |
| EMPLOYEE_CREATED | `employee.created` | `demo_seeder.py:53` | `overseer_config_service.py` | (Employee model dump) | rare |
| EMPLOYEE_UPDATED | `employee.updated` | `config.py:129` (batch push) | `overseer_config_service.py` | (Employee model dump) | rare |
| EMPLOYEE_DELETED | `employee.deleted` | `config.py:129` (batch push) | `overseer_config_service.py` | employee_id | rare |
| TIPOUT_RULE_CREATED | `tipout.rule_created` | `config.py:129` (batch push) | `overseer_config_service.py` | (tipout rule payload) | rare |
| TIPOUT_RULE_UPDATED | `tipout.rule_updated` | `config.py:129` (batch push) | `overseer_config_service.py` | (tipout rule payload) | rare |
| TIPOUT_RULE_DELETED | `tipout.rule_deleted` | `config.py:129` (batch push) | `overseer_config_service.py` | rule_id | rare |

#### Menu Management

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| MENU_ITEM_CREATED | `MENU_ITEM_CREATED` | `config.py:129` (batch push) | `menu_projection.py`, `overseer_config_service.py` | (menu item payload) | rare |
| MENU_ITEM_UPDATED | `MENU_ITEM_UPDATED` | `config.py:129` (batch push) | `menu_projection.py`, `overseer_config_service.py` | (menu item payload) | rare |
| MENU_ITEM_DELETED | `MENU_ITEM_DELETED` | `config.py:129` (batch push) | `menu_projection.py`, `overseer_config_service.py` | item_id | rare |
| MENU_CATEGORY_CREATED | `MENU_CATEGORY_CREATED` | `config.py:129` (batch push) | `menu_projection.py`, `overseer_config_service.py` | (category payload) | rare |
| MENU_CATEGORY_UPDATED | `MENU_CATEGORY_UPDATED` | `config.py:129` (batch push) | `menu_projection.py`, `overseer_config_service.py` | (category payload) | rare |
| MENU_CATEGORY_DELETED | `MENU_CATEGORY_DELETED` | `config.py:129` (batch push) | `menu_projection.py` | category_id | rare |
| MENU_ITEM_86D | `menu.item_86d` | `config.py:145` | `menu_projection.py` | item_id | per-86 |
| MENU_ITEM_RESTORED | `menu.item_restored` | `config.py:156` | `menu_projection.py` | item_id | per-restore |
| MODIFIER_GROUP_CREATED | `MODIFIER_GROUP_CREATED` | `config.py:129` (batch push) | `menu_projection.py` | (modifier group payload) | rare |
| MODIFIER_GROUP_UPDATED | `MODIFIER_GROUP_UPDATED` | `config.py:129` (batch push) | `menu_projection.py` | (modifier group payload) | rare |
| MODIFIER_GROUP_DELETED | `MODIFIER_GROUP_DELETED` | `config.py:129` (batch push) | `menu_projection.py` | group_id | rare |

#### Batch Setup

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| RESTAURANT_CONFIGURED | `restaurant.configured` | `config.py:129` (batch push) | `menu_projection.py` | (full restaurant config) | once (initial setup) |
| TAX_RULES_BATCH_CREATED | `tax_rules.batch_created` | `config.py:129` (batch push) | `menu_projection.py` | (tax rules array) | once |
| CATEGORIES_BATCH_CREATED | `categories.batch_created` | `config.py:129` (batch push) | `menu_projection.py` | (categories array) | once |
| ITEMS_BATCH_CREATED | `items.batch_created` | `config.py:129` (batch push) | `menu_projection.py` | (items array) | once |

#### Floor Plan

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| FLOORPLAN_SECTION_CREATED | `floorplan.section_created` | `config.py:129` (batch push) | `overseer_config_service.py` | (section payload) | rare |
| FLOORPLAN_SECTION_UPDATED | `floorplan.section_updated` | `config.py:129` (batch push) | `overseer_config_service.py` | (section payload) | rare |
| FLOORPLAN_SECTION_DELETED | `floorplan.section_deleted` | `config.py:129` (batch push) | `overseer_config_service.py` | section_id | rare |
| FLOORPLAN_LAYOUT_UPDATED | `floorplan.layout_updated` | `config.py:129` (batch push) | `overseer_config_service.py` | (layout payload) | rare |

#### Hardware

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| TERMINAL_REGISTERED | `TERMINAL_REGISTERED` | `config.py:129` (batch push) | `overseer_config_service.py` | (terminal payload) | rare |
| TERMINAL_UPDATED | `terminal.updated` | `config.py:129` (batch push) | `overseer_config_service.py` | (terminal payload) | rare |
| TERMINAL_TRAINING_MODE_CHANGED | `terminal.training_mode_changed` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| ROUTING_MATRIX_UPDATED | `routing.matrix_updated` | `config.py:129` (batch push) | `overseer_config_service.py` | (routing payload) | rare |
| ROUTING_ITEM_OVERRIDE_CREATED | `routing.item_override_created` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| ROUTING_ITEM_OVERRIDE_DELETED | `routing.item_override_deleted` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### Reporting

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| REPORTING_DASHBOARD_CONFIGURED | `reporting.dashboard_configured` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| REPORTING_CUSTOM_REPORT_SAVED | `reporting.custom_report_saved` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |
| REPORTING_ACCOUNTS_MAPPING_UPDATED | `reporting.accounts_mapping_updated` | **NEVER EMITTED** | **NEVER CONSUMED** | — | — |

#### System

| event_type | Enum Value | Emitted | Consumed | Payload Fields | Frequency |
|---|---|---|---|---|---|
| USER_LOGGED_IN | `USER_LOGGED_IN` | `staff.py:76` | `staff.py`, `reporting.py` | employee_id, employee_name | per-clock-in |
| USER_LOGGED_OUT | `USER_LOGGED_OUT` | `staff.py:95` | `staff.py`, `reporting.py` | employee_id, employee_name | per-clock-out |

---

### Census Summary

| Status | Count |
|---|---|
| Emitted AND consumed (active) | 35 |
| Emitted but NEVER consumed | 19 |
| NEVER emitted but consumed (dead read) | 3 |
| NEVER emitted AND NEVER consumed (dead code) | 34 |
| **Total event types in enum** | **91** |

---

### 0.2 — Event Classification

Each event type assigned exactly one category.

#### LEDGER_CORE — Financial fact or irreversible state change (must stay in immutable ledger)

| event_type | Rationale |
|---|---|
| ORDER_CREATED | Creates a billable entity. Financial anchor for all downstream items/payments. |
| ORDER_CLOSED | Finalizes revenue recognition. Irreversible under normal operation. |
| ORDER_REOPENED | Reverses a close — has financial consequence (order can accrue more charges). |
| ORDER_VOIDED | Cancels revenue. Must be auditable with reason + approver. |
| ITEM_ADDED | Adds a priced line item. Directly affects order total. |
| ITEM_REMOVED | Removes a priced line item. Directly affects order total. |
| ITEM_MODIFIED | Changes quantity or price. Directly affects order total. |
| MODIFIER_APPLIED | Adds/removes priced modifier. Affects line item subtotal. |
| DISCOUNT_APPROVED | Reduces order total. Requires manager approval — must be auditable. |
| PAYMENT_INITIATED | Records intent to collect money. Required for reconciliation. |
| PAYMENT_CONFIRMED | Money collected. The core financial fact. |
| PAYMENT_DECLINED | Payment attempt failed. Needed for reconciliation and dispute resolution. |
| PAYMENT_CANCELLED | Customer cancelled mid-transaction. Settlement reconciliation. |
| PAYMENT_TIMED_OUT | Terminal timeout. Settlement reconciliation. |
| PAYMENT_ERROR | System error during payment. Settlement reconciliation. |
| PAYMENT_REFUNDED | Money returned. Directly affects revenue. |
| TIP_ADJUSTED | Changes tip amount on a confirmed payment. Affects settlement. |
| CASH_TIPS_DECLARED | Server-reported cash tips. Tax/labor compliance record. |
| BATCH_SUBMITTED | Settlement record with totals. Financial checkpoint. |
| DAY_CLOSED | End-of-day financial snapshot. Auditable day boundary. |

#### LEDGER_OPERATIONAL — Operational truth, useful for reconciliation (stays in ledger)

| event_type | Rationale |
|---|---|
| ITEM_SENT | Kitchen fire record. Not financial, but operationally important for order flow and reconciliation. |
| TICKET_PRINTED | Proof that kitchen/bar received the order. Operational audit trail. |
| TICKET_REPRINTED | Reprints are operationally significant (may indicate kitchen issues). |
| BATCH_CLOSED | Backward-compat batch marker. Operational. (See WARNING: redundant with BATCH_SUBMITTED.) |
| USER_LOGGED_IN | Clock-in record. Labor compliance, used by reporting. |
| USER_LOGGED_OUT | Clock-out record. Labor compliance, used by reporting. |
| PRINTER_REGISTERED | Hardware inventory record. Consumed by overseer_config_service. |
| STORE_INFO_UPDATED | Store configuration state. Consumed by store_config_service. |
| STORE_CC_PROCESSING_RATE_UPDATED | Financial configuration (CC rate). Consumed by store_config_service. |
| STORE_TAX_RULE_CREATED | Tax configuration. Consumed by store_config_service. |
| STORE_TAX_RULE_UPDATED | Tax configuration. Consumed by store_config_service. |
| STORE_TAX_RULE_DELETED | Tax configuration. Consumed by store_config_service. |
| STORE_OPERATING_HOURS_UPDATED | Operations config. Consumed by store_config_service. |
| STORE_ORDER_TYPES_UPDATED | Operations config. Consumed by store_config_service. |
| STORE_AUTO_GRATUITY_UPDATED | Financial config (auto-grat rules). Consumed by store_config_service. |
| EMPLOYEE_ROLE_CREATED | Permissions/roles config. Consumed by overseer_config_service. |
| EMPLOYEE_ROLE_UPDATED | Permissions/roles config. Consumed by overseer_config_service. |
| EMPLOYEE_ROLE_DELETED | Permissions/roles config. Consumed by overseer_config_service. |
| EMPLOYEE_CREATED | Staff record. Consumed by overseer_config_service. |
| EMPLOYEE_UPDATED | Staff record. Consumed by overseer_config_service. |
| EMPLOYEE_DELETED | Staff record. Consumed by overseer_config_service. |
| TIPOUT_RULE_CREATED | Financial config (tip distribution). Consumed by overseer_config_service. |
| TIPOUT_RULE_UPDATED | Financial config (tip distribution). Consumed by overseer_config_service. |
| TIPOUT_RULE_DELETED | Financial config (tip distribution). Consumed by overseer_config_service. |
| MENU_ITEM_CREATED | Menu config. Consumed by menu_projection + overseer_config_service. |
| MENU_ITEM_UPDATED | Menu config. Consumed by menu_projection + overseer_config_service. |
| MENU_ITEM_DELETED | Menu config. Consumed by menu_projection + overseer_config_service. |
| MENU_CATEGORY_CREATED | Menu config. Consumed by menu_projection + overseer_config_service. |
| MENU_CATEGORY_UPDATED | Menu config. Consumed by menu_projection + overseer_config_service. |
| MENU_CATEGORY_DELETED | Menu config. Consumed by menu_projection. |
| MENU_ITEM_86D | Menu availability. Consumed by menu_projection. |
| MENU_ITEM_RESTORED | Menu availability. Consumed by menu_projection. |
| MODIFIER_GROUP_CREATED | Menu config. Consumed by menu_projection. |
| MODIFIER_GROUP_UPDATED | Menu config. Consumed by menu_projection. |
| MODIFIER_GROUP_DELETED | Menu config. Consumed by menu_projection. |
| RESTAURANT_CONFIGURED | Initial setup config. Consumed by menu_projection. |
| TAX_RULES_BATCH_CREATED | Initial setup config. Consumed by menu_projection. |
| CATEGORIES_BATCH_CREATED | Initial setup config. Consumed by menu_projection. |
| ITEMS_BATCH_CREATED | Initial setup config. Consumed by menu_projection. |
| FLOORPLAN_SECTION_CREATED | Floor plan config. Consumed by overseer_config_service. |
| FLOORPLAN_SECTION_UPDATED | Floor plan config. Consumed by overseer_config_service. |
| FLOORPLAN_SECTION_DELETED | Floor plan config. Consumed by overseer_config_service. |
| FLOORPLAN_LAYOUT_UPDATED | Floor plan config. Consumed by overseer_config_service. |
| TERMINAL_REGISTERED | Hardware config. Consumed by overseer_config_service. |
| TERMINAL_UPDATED | Hardware config. Consumed by overseer_config_service. |
| ROUTING_MATRIX_UPDATED | Routing config. Consumed by overseer_config_service. |

#### EPHEMERAL — Should move to a separate non-chained log

| event_type | Rationale |
|---|---|
| TICKET_PRINT_FAILED | Transient hardware state. No financial consequence. Inflates hash chain on every print retry. |
| PRINT_RETRYING | Per-retry-attempt noise. Fires up to 3x per failed print. Zero downstream consumers. |
| PRINT_REROUTED | Fallback routing detail. Operationally interesting but not auditable. No consumers. |
| PRINTER_STATUS_CHANGED | Fires on every status transition in a 2s polling loop. High volume. No consumers. |
| PRINTER_ERROR | Alert-level event. Useful for ops dashboard but not financial ledger. No consumers. |
| PRINTER_ROLE_CREATED | Printer setup detail. No consumers. |
| PRINTER_FALLBACK_ASSIGNED | Printer setup detail. No consumers. |
| PRINTER_HEALTH_WARNING | Proactive alert (overheat). No consumers. |
| PRINTER_REBOOT_STARTED | Maintenance event. No consumers. |
| PRINTER_REBOOT_COMPLETED | Maintenance event. No consumers. |
| DRAWER_OPENED | Cash drawer kick. Operational telemetry, not financial. No consumers. |
| DRAWER_OPEN_FAILED | Hardware failure. No consumers. |
| DEVICE_STATUS_CHANGED | Payment device polling event. Fires on every status change in 2s loop. No consumers. |

#### DROP — Defined in enum but never emitted AND never consumed (dead code)

| event_type | Rationale |
|---|---|
| ORDER_TYPE_CHANGED | Defined, never wired. |
| ITEM_VOIDED | Defined, never emitted. Read path in print_context_builder is dead. |
| ITEM_COMPED | Defined, never emitted. Read path in print_context_builder is dead. |
| DISCOUNT_REQUESTED | Defined, never wired. |
| DISCOUNT_REJECTED | Defined, never wired. |
| DISCOUNT_APPLIED | Defined, never emitted. Read path in print_context_builder is dead. |
| RECEIPT_PRINTED | Defined, never wired. |
| RECEIPT_REPRINTED | Defined, never wired. |
| PRINT_JOB_QUEUED | Defined, never wired. |
| PRINT_JOB_SENT | Defined, never wired. |
| PRINT_JOB_COMPLETED | Defined, never wired. |
| PRINT_JOB_FAILED | Defined, never wired. |
| PRINT_JOB_RETRIED | Defined, never wired. |
| PRINTER_ROLE_ASSIGNED | Defined, never wired. |
| PRINTER_CONFIG_UPDATED | Defined, never wired. |
| TEMPLATE_CONFIG_UPDATED | Defined, never wired. |
| DELIVERY_INFO_ADDED | Defined, never wired. Future feature. |
| DRIVER_ASSIGNED | Defined, never wired. Future feature. |
| DELIVERY_DISPATCHED | Defined, never wired. Future feature. |
| DELIVERY_COMPLETED | Defined, never wired. Future feature. |
| PAYMENT_DEVICE_REGISTERED | Defined, never wired. |
| PAYMENT_DEVICE_CONNECTED | Defined, never wired. |
| PAYMENT_DEVICE_DISCONNECTED | Defined, never wired. |
| PAYMENT_DEVICE_ERROR | Defined, never wired. |
| PAYMENT_DEVICE_REBOOTED | Defined, never wired. |
| PAYMENT_WAITING | Defined, never wired. |
| PAYMENT_PROCESSING | Defined, never wired. |
| PAYMENT_APPROVED | Defined, never wired. |
| PAYMENT_CAPTURED | Defined, never wired. |
| PAYMENT_VOIDED | Defined, never wired. |
| PAYMENT_FAILED | Defined, never wired. Duplicate concept with PAYMENT_DECLINED. |
| PAYMENT_REFUND_FAILED | Defined, never wired. |
| TIP_ADDED | Defined, never wired. Duplicate concept with TIP_ADJUSTED. |
| TIP_ADJUST_SENT | Defined, never wired. |
| TIP_ADJUST_CONFIRMED | Defined, never wired. |
| TIP_ADJUST_FAILED | Defined, never wired. |
| SPLIT_STARTED | Defined, never wired. Future feature. |
| SPLIT_PAYMENT_COMPLETED | Defined, never wired. Future feature. |
| SPLIT_COMPLETED | Defined, never wired. Future feature. |
| DUPLICATE_PAYMENT_BLOCKED | Defined, never wired. |
| DEVICE_DISCOVERED | Defined, never wired. |
| DEVICE_IP_CHANGED | Defined, never wired. |
| DEVICE_RESTORED | Defined, never wired. |
| TERMINAL_TRAINING_MODE_CHANGED | Defined, never wired. |
| ROUTING_ITEM_OVERRIDE_CREATED | Defined, never wired. |
| ROUTING_ITEM_OVERRIDE_DELETED | Defined, never wired. |
| REPORTING_DASHBOARD_CONFIGURED | Defined, never wired. |
| REPORTING_CUSTOM_REPORT_SAVED | Defined, never wired. |
| REPORTING_ACCOUNTS_MAPPING_UPDATED | Defined, never wired. |

---

### 0.3 — Anomalies

#### A1: `EMPLOYEE_REGISTERED` — Runtime crash bug
- **File:** `backend/app/api/routes/config.py:198`
- **Issue:** `EventType.EMPLOYEE_REGISTERED` is referenced but does not exist in the `EventType` enum. This will throw `ValueError` at runtime when `POST /config/employees` is called.
- **Probable intent:** Should be `EventType.EMPLOYEE_CREATED`.

#### A2: BATCH_CLOSED + BATCH_SUBMITTED double-emit
- **File:** `backend/app/api/routes/orders.py:1140-1148`
- **Issue:** `close_batch()` emits both `BATCH_SUBMITTED` (with full settlement totals) and `BATCH_CLOSED` (with only `order_count`). Comment on line 1142 says "Keep BATCH_CLOSED for backward compatibility." Neither event has any downstream consumer.
- **Impact:** Two events in the hash chain for one user action. `BATCH_CLOSED` payload is a strict subset of `BATCH_SUBMITTED`.

#### A3: TICKET_PRINTED double-emit on fallback reroute
- **File:** `backend/app/core/adapters/printer_manager.py:646-667`
- **Issue:** When a print job succeeds via fallback, the manager emits both `PRINT_REROUTED` and `TICKET_PRINTED`. This is two events for one successful print. The `TICKET_PRINTED` event is consumed by `projections.py`; the `PRINT_REROUTED` event is not consumed.

#### A4: PRINTER_STATUS_CHANGED fires on polling loop
- **File:** `backend/app/core/adapters/printer_manager.py:756-763`
- **Issue:** `check_all_printers()` emits `PRINTER_STATUS_CHANGED` on every status transition. If called in a polling loop (e.g., health check every few seconds), and a printer is flapping, this could generate high-frequency events in the immutable ledger. No downstream consumer reads these events.

#### A5: DEVICE_STATUS_CHANGED fires on 2-second polling
- **File:** `backend/app/core/adapters/payment_health.py:66-82`
- **Issue:** The health monitor sleeps 2 seconds between checks (`await asyncio.sleep(2.0)`). On every device status transition, it emits `DEVICE_STATUS_CHANGED` to the immutable ledger. No downstream consumer. Could generate hundreds of events per hour if device connection is unstable.

#### A6: DISCOUNT_APPLIED / ITEM_VOIDED / ITEM_COMPED — Dead read paths
- **Files:** `backend/app/services/print_context_builder.py:277,528` (DISCOUNT_APPLIED), and similar for ITEM_VOIDED, ITEM_COMPED
- **Issue:** `print_context_builder.py` filters for these event types, but they are never emitted anywhere. These read paths are dead code and will never match any events.

#### A7: 48 event types with zero emitters and zero consumers
- **File:** `backend/app/core/events.py:28-207`
- **Issue:** 34 types are completely dead (never emitted, never consumed). An additional 14 are emitted but never consumed. These inflate the enum and create false expectations about ledger contents.

#### A8: Inconsistent naming convention
- **File:** `backend/app/core/events.py:28-207`
- **Issue:** Mixed naming styles in the same enum:
  - UPPERCASE: `ORDER_CREATED`, `ITEM_ADDED`, `PAYMENT_WAITING`, `MENU_ITEM_CREATED`
  - dot.notation: `payment.initiated`, `payment.confirmed`, `batch.closed`, `store.info_updated`, `employee.role_created`
- This makes filtering by prefix unreliable and confuses string matching.

---

## PHASE 1 — Severity-Ranked Recommendation Report

### CRITICAL (5)

| # | event_type | Current | Recommended | Rationale | File + Line |
|---|---|---|---|---|---|
| C1 | DEVICE_STATUS_CHANGED | EPHEMERAL | EPHEMERAL | **Polling noise in immutable ledger.** Fires every 2s on device status change. Zero consumers. Inflates hash chain with non-financial telemetry. Must move to ephemeral log immediately. | `payment_health.py:82` |
| C2 | PRINTER_STATUS_CHANGED | EPHEMERAL | EPHEMERAL | **Polling noise in immutable ledger.** Fires on every health check status transition. Zero consumers. Same risk as C1 — high-frequency non-financial events inflating the chain. | `printer_manager.py:763` |
| C3 | PRINT_RETRYING | EPHEMERAL | EPHEMERAL | **Per-retry noise.** Up to 3 events per failed print job. Zero consumers. Pure debugging telemetry that adds 3 hash-chain entries per failure. | `printer_manager.py:522` |
| C4 | TICKET_PRINT_FAILED | EPHEMERAL | EPHEMERAL | **Hardware failure noise.** Can fire 3x per job (not-ready + per-retry-exhaust + no-fallback). Zero consumers. Non-financial. | `printer_manager.py:454,538,709` |
| C5 | `EMPLOYEE_REGISTERED` | N/A (bug) | FIX | **Runtime crash.** `config.py:198` references `EventType.EMPLOYEE_REGISTERED` which doesn't exist. `POST /config/employees` will throw ValueError. Should be `EventType.EMPLOYEE_CREATED`. | `config.py:198` |

### WARNING (7)

| # | event_type | Current | Recommended | Rationale | File + Line |
|---|---|---|---|---|---|
| W1 | BATCH_CLOSED | LEDGER_OPERATIONAL | DROP | **Redundant with BATCH_SUBMITTED.** Payload (`order_count`) is a strict subset. Comment admits "backward compatibility." Zero consumers. Remove emission. | `orders.py:1148` |
| W2 | PRINT_REROUTED | EPHEMERAL | EPHEMERAL | **Double-emit with TICKET_PRINTED.** On fallback success, both PRINT_REROUTED and TICKET_PRINTED are emitted. PRINT_REROUTED has zero consumers. Move to ephemeral log. | `printer_manager.py:646` |
| W3 | PRINTER_ERROR | EPHEMERAL | EPHEMERAL | **Alert event in financial ledger.** Fires on total print failure. Zero consumers. Should be in an ops/alert log, not the hash chain. | `printer_manager.py:876,897` |
| W4 | DRAWER_OPENED / DRAWER_OPEN_FAILED | EPHEMERAL | EPHEMERAL | **Hardware telemetry.** Fires per cash payment. Zero consumers. Cash drawer state has no financial meaning (the PAYMENT_CONFIRMED event is the financial fact). | `printer_manager.py:722,709,733` |
| W5 | PRINTER_REBOOT_STARTED / COMPLETED | EPHEMERAL | EPHEMERAL | **Maintenance telemetry.** Zero consumers. Fires per reboot cycle. Not financial or operational. | `printer_manager.py:804,819` |
| W6 | PRINTER_HEALTH_WARNING | EPHEMERAL | EPHEMERAL | **Proactive alert.** Only fires on overheat detection. Zero consumers. Should be in ops log. | `printer_manager.py:779` |
| W7 | CASH_TIPS_DECLARED | LEDGER_CORE | LEDGER_CORE | **Missing correlation_id.** Event is financial (tax compliance) but is emitted without `correlation_id`, making it hard to correlate with the server's orders for the day. | `staff.py:149` |

### INFO (5)

| # | event_type | Current | Recommended | Rationale | File + Line |
|---|---|---|---|---|---|
| I1 | 48 dead enum values | DROP | DROP | **Enum bloat.** 34 types never emitted/consumed + 14 emitted but never consumed. Consider pruning or clearly marking as `# RESERVED` for future use. | `events.py:28-207` |
| I2 | PAYMENT_CANCELLED / TIMED_OUT / ERROR | LEDGER_CORE | LEDGER_CORE | **No downstream consumer.** These are emitted by `payment_manager.py:138` but no projection or report reads them. They are ledger-worthy (payment terminal state) but the projection should handle them for completeness. | `payment_manager.py:138` |
| I3 | TICKET_REPRINTED | LEDGER_OPERATIONAL | LEDGER_OPERATIONAL | **No downstream consumer.** Emitted but never queried. Operationally useful (reprint audit) but consider whether it needs to be in the immutable chain vs. ephemeral log. | `printer_manager.py:472` |
| I4 | Mixed naming convention | N/A | N/A | **Inconsistency.** Some types use UPPERCASE (`ORDER_CREATED`), others use dot.notation (`payment.initiated`). Consider standardizing. Not urgent but complicates prefix-based filtering. | `events.py:28-207` |
| I5 | BATCH_SUBMITTED | LEDGER_CORE | LEDGER_CORE | **Emitted twice per day-close.** Both `close_batch()` and `close_day()` emit BATCH_SUBMITTED. If both are called, two settlement records exist. Not necessarily wrong (they represent different actions), but worth documenting the expected flow. | `orders.py:1140,1245` |

---

### Finding Summary

| Severity | Count |
|---|---|
| CRITICAL | 5 |
| WARNING | 7 |
| INFO | 5 |
| **Total** | **17** |

---

## PHASE 2 — Awaiting Approval

**No code modifications have been made.** This report is read-only.

Before proposing an implementation plan, explicit approval is required for:

1. **CRITICAL C1-C4:** Move 13 ephemeral event types to a separate non-chained log
2. **CRITICAL C5:** Fix `EMPLOYEE_REGISTERED` -> `EMPLOYEE_CREATED` bug in `config.py:198`
3. **WARNING W1:** Remove redundant `BATCH_CLOSED` emission
4. **WARNING W2-W6:** Confirm ephemeral classification for printer/drawer events
5. **WARNING W7:** Add `correlation_id` to `CASH_TIPS_DECLARED`
6. **INFO I1:** Prune or mark 48 dead enum values
7. **INFO I2:** Add handling for PAYMENT_CANCELLED/TIMED_OUT/ERROR in projections

Please review and approve which findings to action before Phase 2 begins.
