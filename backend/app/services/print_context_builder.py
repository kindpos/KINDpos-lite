import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from ..core.event_ledger import EventLedger
from ..core.projections import project_order
from ..core.events import EventType
from ..config import settings

logger = logging.getLogger("kindpos.printing.context_builder")


# ── Ticket number helper ───────────────────────────────────────────────────────
async def _get_ticket_number(ledger: EventLedger, order_id: str) -> str:
    try:
        boundary    = await ledger.get_last_day_close_sequence()
        events      = await ledger.get_events_since(boundary, limit=50000)
        created_ids = [
            e.correlation_id for e in events
            if e.event_type == EventType.ORDER_CREATED
        ]
        try:
            position = created_ids.index(order_id) + 1
        except ValueError:
            position = len(created_ids) + 1
        return f"C-{position:03d}"
    except Exception as e:
        logger.warning(f"Could not derive ticket number for {order_id}: {e}")
        return "C-???"


ORDER_TYPE_LABELS = {
    "dine_in":       "DINE IN",
    "to_go":         "TO GO",
    "bar_tab":       "BAR TAB",
    "delivery":      "DELIVERY",
    "staff":         "STAFF MEAL",
    "quick_service": "QUICK SERVICE",
}


class PrintContextBuilder:
    def __init__(self, ledger: EventLedger):
        self.ledger = ledger

    # ─────────────────────────────────────────────────────────────────────────
    #  GUEST RECEIPT
    # ─────────────────────────────────────────────────────────────────────────

    async def build_receipt_context(
        self,
        order_id: str,
        copy_type: str = "customer",
        is_reprint: bool = False,
    ) -> Dict[str, Any]:

        events = await self.ledger.get_events_by_correlation(order_id)
        if not events:
            raise ValueError(f"Order {order_id} not found in ledger")

        order         = project_order(events)
        ticket_number = await _get_ticket_number(self.ledger, order_id)
        order_type    = getattr(order, "order_type", "quick_service")

        # ── Timestamps ────────────────────────────────────────────────────────
        created_at = getattr(order, "created_at", None)
        opened_at  = created_at.isoformat() if created_at else None
        closed_at  = None
        for e in reversed(events):
            if e.event_type == EventType.ORDER_CLOSED:
                closed_at = e.timestamp.isoformat()
                break

        # ── Payment info ──────────────────────────────────────────────────────
        payment_method = "cash"
        card_last_four = None
        tip_amount     = 0.0

        for p in (order.payments or []):
            if p.status == "confirmed":
                payment_method = p.method
                tip_amount    += getattr(p, "tip_amount", 0.0)
                if p.method == "card" and p.transaction_id:
                    card_last_four = p.transaction_id[-4:]

        # ── Items ─────────────────────────────────────────────────────────────
        items = []
        for item in (order.items or []):
            mods = []
            for m in (item.modifiers or []):
                mods.append(m.get("name", str(m)) if isinstance(m, dict) else str(m))
            items.append({
                "qty":       item.quantity,
                "name":      item.name,
                "price":     float(item.price),
                "subtotal":  float(item.subtotal),
                "modifiers": mods,
                "notes":     getattr(item, "notes", None),
            })

        # ── Tax lines — template iterates a list ──────────────────────────────
        tax_lines = [{"label": "Tax", "amount": float(order.tax or 0)}]

        return {
            "order_id":                   order_id,
            "ticket_number":              ticket_number,
            "copy_type":                  copy_type,
            "is_reprint":                 is_reprint,
            "order_type":                 order_type,
            "opened_at":                  opened_at,
            "closed_at":                  closed_at,
            "table":                      getattr(order, "table", None),
            "server_name":                getattr(order, "server_name", None),
            "items":                      items,
            "subtotal":                   float(order.subtotal or 0),
            "tax_lines":                  tax_lines,
            "total":                      float(order.total or 0),
            "tip_amount":                 tip_amount,
            "payment_method":             payment_method,
            "card_last_four":             card_last_four,
            "tip_suggestion_percentages": [15, 18, 20],
            "tip_calculation_base":       "pretax",
            # Restaurant — from config eventually
            "restaurant_name":  "KINDpos Demo",
            "address":          "",
            "phone":            "",
            "footer_message":   "Thank you!",
        }

    # ─────────────────────────────────────────────────────────────────────────
    #  KITCHEN TICKET
    # ─────────────────────────────────────────────────────────────────────────

    async def build_kitchen_context(
        self,
        order_id: str,
        station_name: str = "General",
        is_reprint: bool = False,
        original_fired_at: Optional[str] = None,
    ) -> Dict[str, Any]:

        events = await self.ledger.get_events_by_correlation(order_id)
        if not events:
            raise ValueError(f"Order {order_id} not found in ledger")

        order         = project_order(events)
        ticket_number = await _get_ticket_number(self.ledger, order_id)
        order_type    = getattr(order, "order_type", "quick_service")
        fired_at      = datetime.now(timezone.utc).strftime("%I:%M %p")

        # ── Items ─────────────────────────────────────────────────────────────
        items = []
        seats = set()
        for item in (order.items or []):
            seat = getattr(item, "seat_number", None)
            if seat:
                seats.add(seat)
            mods = []
            for m in (item.modifiers or []):
                mods.append(m if isinstance(m, dict) else str(m))
            notes = getattr(item, "notes", None)
            items.append({
                "qty":                  item.quantity,
                "name":                 item.name,
                "kitchen_text":         item.name,
                "modifiers":            mods,
                "special_instructions": notes or "",
                "allergy":              "",
                "category":             getattr(item, "category", None),
                "seat_number":          seat,
            })

        return {
            "order_id":           order_id,
            "ticket_number":      ticket_number,
            "check_number":       ticket_number,
            "ticket_type":        "REPRINT" if is_reprint else "ORIGINAL",
            "ticket_index":       1,
            "ticket_total":       1,
            "order_type":         order_type,
            "order_type_display": ORDER_TYPE_LABELS.get(order_type, order_type.upper()),
            "table":              getattr(order, "table", None),
            "server":             getattr(order, "server_name", None),
            "server_name":        getattr(order, "server_name", None),
            "seats":              sorted(seats) if seats else None,
            "fired_at":           fired_at,
            "original_fired_at":  original_fired_at,
            "items":              items,
            "station_name":       station_name,
            "terminal_id":        settings.terminal_id,
            "supports_red":       False,
            "rush":               False,
            "vip":                False,
            "warnings_86":        [],
        }

    async def build_server_checkout_context(
            self,
            server_id: str,
            server_name: str,
            *,
            declared_cash_tips: float = None,
            tip_out_overrides: dict = None,
            is_reprint: bool = False,
    ) -> Dict[str, Any]:
        """
        Build context for ServerCheckoutTemplate.

        Aggregates all orders closed by this server since the last DAY_CLOSED
        boundary event. Designed to be called at end-of-shift cashout.

        Args:
            server_id:          Employee ID of the server being checked out.
            server_name:        Display name for the receipt header.
            declared_cash_tips: Cash tips declared by the server (None = not yet declared).
            tip_out_overrides:  Dict of {role: override_amount} if manager adjusted.
            is_reprint:         Whether this is a reprint of a previous checkout.
        """
        boundary = await self.ledger.get_last_day_close_sequence()
        all_events = await self.ledger.get_events_since(boundary, limit=50000)

        # ── Filter to this server's orders ────────────────────────────────────
        # Collect order IDs where this server is the owner
        server_order_ids = set()
        for e in all_events:
            if e.event_type == EventType.ORDER_CREATED:
                payload = e.payload or {}
                if payload.get("server_id") == server_id or payload.get("server_name") == server_name:
                    server_order_ids.add(e.correlation_id)

        # ── Project each order ────────────────────────────────────────────────
        checks_closed = 0
        gross_sales = 0.0
        voids_total = 0.0
        comps_total = 0.0
        discounts_total = 0.0
        tax_collected = 0.0
        cash_sales = 0.0
        card_sales = 0.0
        cc_transactions = []
        open_tip_count = 0

        for order_id in server_order_ids:
            order_events = await self.ledger.get_events_by_correlation(order_id)
            if not order_events:
                continue

            order = project_order(order_events)

            # Only count closed orders
            is_closed = any(
                e.event_type == EventType.ORDER_CLOSED for e in order_events
            )
            if not is_closed:
                continue

            checks_closed += 1

            order_subtotal = float(order.subtotal or 0)
            order_tax = float(order.tax or 0)
            order_total = float(order.total or 0)
            gross_sales += order_subtotal
            tax_collected += order_tax

            # ── Aggregate voids/comps from events ─────────────────────────────
            for e in order_events:
                payload = e.payload or {}
                if e.event_type == EventType.ITEM_VOIDED:
                    voids_total += float(payload.get("amount", 0))
                elif e.event_type == EventType.ITEM_COMPED:
                    comps_total += float(payload.get("amount", 0))
                elif e.event_type == EventType.DISCOUNT_APPLIED:
                    discounts_total += float(payload.get("amount", 0))

            # ── Payment details ───────────────────────────────────────────────
            for p in (order.payments or []):
                if p.status != "confirmed":
                    continue
                amount = float(getattr(p, "amount", 0) or 0)
                tip = float(getattr(p, "tip_amount", 0) or 0)

                if p.method == "cash":
                    cash_sales += amount
                elif p.method == "card":
                    card_sales += amount
                    last4 = None
                    if p.transaction_id:
                        last4 = p.transaction_id[-4:]

                    # Determine ticket number for CC detail line
                    ticket_num = await _get_ticket_number(self.ledger, order_id)

                    tip_open = getattr(p, "tip_open", False) or (tip == 0.0)
                    if tip_open:
                        open_tip_count += 1

                    cc_transactions.append({
                        "check_number": ticket_num,
                        "card_last_four": last4 or "****",
                        "total": amount,
                        "tip": tip,
                        "tip_open": tip_open,
                    })

        net_sales = gross_sales - voids_total - comps_total - discounts_total
        cc_tips_total = sum(t["tip"] for t in cc_transactions)
        gross_tips = cc_tips_total + (declared_cash_tips or 0.0)

        # ── Clock in/out (from CLOCK_IN / CLOCK_OUT events) ───────────────────
        clock_in = None
        clock_out = None
        for e in all_events:
            payload = e.payload or {}
            eid = payload.get("employee_id") or payload.get("server_id")
            if eid != server_id:
                continue
            if e.event_type == EventType.CLOCK_IN:
                clock_in = e.timestamp.isoformat() if e.timestamp else None
            elif e.event_type == EventType.CLOCK_OUT:
                clock_out = e.timestamp.isoformat() if e.timestamp else None

        # Shift duration
        shift_duration = ""
        if clock_in and clock_out:
            try:
                dt_in = datetime.fromisoformat(clock_in.replace("Z", "+00:00"))
                dt_out = datetime.fromisoformat(clock_out.replace("Z", "+00:00"))
                delta = dt_out - dt_in
                hours, remainder = divmod(int(delta.total_seconds()), 3600)
                minutes = remainder // 60
                shift_duration = f"{hours}h {minutes}m"
            except Exception:
                shift_duration = ""

        # ── Tip-out calculation ───────────────────────────────────────────────
        # Tip-out presets come from config; overrides from manager at cashout
        tip_out_presets = getattr(settings, "tip_out_presets", [])
        tip_outs = []
        total_tip_out = 0.0

        for preset in tip_out_presets:
            role = preset.get("role", "")
            pct = preset.get("percentage", 0.0)
            basis = preset.get("basis", "net_sales")

            # Determine the base amount for this tip-out
            if basis == "net_sales":
                base_amount = net_sales
            elif basis == "alcohol" or basis == "alcohol_sales":
                base_amount = float(preset.get("base_override", 0))
                # TODO: derive alcohol sales from category data when available
            elif basis == "food" or basis == "food_sales":
                base_amount = float(preset.get("base_override", 0))
                # TODO: derive food sales from category data when available
            else:
                base_amount = net_sales

            calculated = round(base_amount * (pct / 100), 2)

            # Apply manager override if present
            adjusted = False
            not_staffed = preset.get("not_staffed", False)
            if tip_out_overrides and role in tip_out_overrides:
                override_val = tip_out_overrides[role]
                if override_val is None:
                    not_staffed = True
                    calculated = 0.0
                else:
                    adjusted = (override_val != calculated)
                    calculated = round(float(override_val), 2)

            tip_outs.append({
                "role": role,
                "basis_description": f"{pct}% {basis.replace('_', ' ')}",
                "amount": calculated,
                "adjusted": adjusted,
                "not_staffed": not_staffed,
            })
            total_tip_out += calculated

        net_tips = gross_tips - total_tip_out

        # ── Tip pool (if server is in one) ────────────────────────────────────
        tip_pool = None
        # TODO: Check staff config for pool membership
        # If server is in a pool, set:
        # tip_pool = {
        #     "name": "BAR POOL",
        #     "tips_collected": <sum of tips this server collected>,
        # }

        # ── Cash collected = cash sales total (cash tendered) ─────────────────
        cash_collected = cash_sales

        today = datetime.now(timezone.utc).strftime("%m/%d/%Y")

        return {
            "is_reprint": is_reprint,
            "restaurant_name": getattr(settings, "restaurant_name", "KINDpos"),
            "server_name": server_name,
            "date": today,
            "clock_in": clock_in,
            "clock_out": clock_out,
            "shift_duration": shift_duration,
            "checks_closed": checks_closed,
            "gross_sales": round(gross_sales, 2),
            "voids_total": round(voids_total, 2),
            "comps_total": round(comps_total, 2),
            "discounts_total": round(discounts_total, 2),
            "net_sales": round(net_sales, 2),
            "tax_collected": round(tax_collected, 2),
            "cash_sales": round(cash_sales, 2),
            "card_sales": round(card_sales, 2),
            "show_cc_detail": getattr(settings, "show_cc_detail", True),
            "cc_transactions": cc_transactions,
            "cc_tips_total": round(cc_tips_total, 2),
            "declared_cash_tips": declared_cash_tips,
            "gross_tips": round(gross_tips, 2),
            "tip_pool": tip_pool,
            "tip_outs": tip_outs,
            "total_tip_out": round(total_tip_out, 2),
            "net_tips": round(net_tips, 2),
            "cash_collected": round(cash_collected, 2),
            "cc_tips_payout": getattr(settings, "cc_tips_payout", "cash"),
            "open_tip_count": open_tip_count,
            "require_manager_sign": getattr(settings, "require_manager_sign", True),
        }

    # ─────────────────────────────────────────────────────────────────────────
    #  SALES RECAP CONTEXT
    # ─────────────────────────────────────────────────────────────────────────

    async def build_sales_recap_context(
            self,
            *,
            printed_by: str = "",
            is_reprint: bool = False,
    ) -> Dict[str, Any]:
        """
        Build context for SalesRecapTemplate.

        Aggregates ALL orders since the last DAY_CLOSED boundary.
        This is a manager-only report showing the full day's performance.

        Args:
            printed_by: Name of the manager printing the report.
            is_reprint: Whether this is a reprint.
        """
        boundary = await self.ledger.get_last_day_close_sequence()
        all_events = await self.ledger.get_events_since(boundary, limit=50000)

        # ── Collect all order IDs created today ────────────────────────────────
        order_ids = []
        for e in all_events:
            if e.event_type == EventType.ORDER_CREATED:
                order_ids.append(e.correlation_id)

        # ── Aggregate across all orders ───────────────────────────────────────
        total_checks = 0
        gross_sales = 0.0
        voids_total = 0.0
        voids_count = 0
        comps_total = 0.0
        comps_count = 0
        discounts_total = 0.0
        discounts_count = 0
        tax_collected = 0.0
        cash_sales = 0.0
        cash_count = 0
        card_sales = 0.0
        card_count = 0
        total_tips = 0.0
        covers = 0
        category_totals = {}  # {category_name: {"total": float, "count": int}}

        for order_id in order_ids:
            order_events = await self.ledger.get_events_by_correlation(order_id)
            if not order_events:
                continue

            order = project_order(order_events)

            # Only count closed orders
            is_closed = any(
                e.event_type == EventType.ORDER_CLOSED for e in order_events
            )
            if not is_closed:
                continue

            total_checks += 1
            order_subtotal = float(order.subtotal or 0)
            order_tax = float(order.tax or 0)
            gross_sales += order_subtotal
            tax_collected += order_tax

            # Covers (seats/guests)
            seats = set()
            for item in (order.items or []):
                seat = getattr(item, "seat_number", None)
                if seat:
                    seats.add(seat)
                # Category aggregation
                cat = getattr(item, "category", None) or "Uncategorized"
                item_total = float(item.quantity * item.price)
                if cat not in category_totals:
                    category_totals[cat] = {"total": 0.0, "count": 0}
                category_totals[cat]["total"] += item_total
                category_totals[cat]["count"] += item.quantity

            covers += max(len(seats), 1)  # At least 1 guest per check

            # Voids / comps / discounts from events
            for e in order_events:
                payload = e.payload or {}
                if e.event_type == EventType.ITEM_VOIDED:
                    voids_total += float(payload.get("amount", 0))
                    voids_count += 1
                elif e.event_type == EventType.ITEM_COMPED:
                    comps_total += float(payload.get("amount", 0))
                    comps_count += 1
                elif e.event_type == EventType.DISCOUNT_APPLIED:
                    discounts_total += float(payload.get("amount", 0))
                    discounts_count += 1

            # Payments
            for p in (order.payments or []):
                if p.status != "confirmed":
                    continue
                amount = float(getattr(p, "amount", 0) or 0)
                tip = float(getattr(p, "tip_amount", 0) or 0)
                total_tips += tip

                if p.method == "cash":
                    cash_sales += amount
                    cash_count += 1
                elif p.method == "card":
                    card_sales += amount
                    card_count += 1

        net_sales = gross_sales - voids_total - comps_total - discounts_total
        total_payments = cash_sales + card_sales
        avg_check = round(net_sales / total_checks, 2) if total_checks > 0 else 0.0
        per_person_avg = round(net_sales / covers, 2) if covers > 0 else 0.0

        # ── Category sales (sorted by total descending) ───────────────────────
        category_sales = sorted(
            [
                {"name": name, "total": round(data["total"], 2), "count": data["count"]}
                for name, data in category_totals.items()
            ],
            key=lambda c: c["total"],
            reverse=True,
        )

        # ── Tax lines ─────────────────────────────────────────────────────────
        tax_lines = [{"label": "Tax", "amount": round(tax_collected, 2)}]

        # ── Daypart breakdown ─────────────────────────────────────────────────
        # TODO: Implement daypart bucketing once order timestamps are available
        # dayparts = [
        #     {"name": "Breakfast (6a-11a)", "sales": 0.0, "checks": 0},
        #     {"name": "Lunch (11a-3p)",     "sales": 0.0, "checks": 0},
        #     {"name": "Dinner (3p-10p)",    "sales": 0.0, "checks": 0},
        #     {"name": "Late Night (10p+)",  "sales": 0.0, "checks": 0},
        # ]
        dayparts = []

        today = datetime.now(timezone.utc).strftime("%m/%d/%Y")

        return {
            "is_reprint": is_reprint,
            "restaurant_name": getattr(settings, "restaurant_name", "KINDpos"),
            "date": today,
            "date_from": today,
            "date_to": "",
            "printed_by": printed_by,
            "printed_at": datetime.now(timezone.utc).isoformat(),
            "gross_sales": round(gross_sales, 2),
            "voids_total": round(voids_total, 2),
            "voids_count": voids_count,
            "comps_total": round(comps_total, 2),
            "comps_count": comps_count,
            "discounts_total": round(discounts_total, 2),
            "discounts_count": discounts_count,
            "net_sales": round(net_sales, 2),
            "tax_collected": round(tax_collected, 2),
            "tax_lines": tax_lines,
            "cash_sales": round(cash_sales, 2),
            "cash_count": cash_count,
            "card_sales": round(card_sales, 2),
            "card_count": card_count,
            "other_payments": [],
            "total_payments": round(total_payments, 2),
            "total_tips": round(total_tips, 2),
            "category_sales": category_sales,
            "total_checks": total_checks,
            "avg_check": avg_check,
            "covers": covers,
            "per_person_avg": per_person_avg,
            "dayparts": dayparts,
            "terminal_id": settings.terminal_id,
        }