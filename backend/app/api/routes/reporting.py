"""
Reporting API Routes

Endpoints for sales and labor reporting summaries.
Wired to real event ledger data — aggregates from today's orders and clock events.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from decimal import Decimal
from datetime import datetime, timezone

from app.api.dependencies import get_ledger
from app.core.event_ledger import EventLedger
from app.core.events import EventType
from app.core.projections import project_orders
from app.core.money import money_round

router = APIRouter(prefix="/reports", tags=["reporting"])

_ZERO = Decimal("0")


# ── helpers ─────────────────────────────────────────────────────────────────

async def _get_current_day_events(ledger: EventLedger, limit: int = 50000):
    """Get events since the last day close (current business day)."""
    boundary = await ledger.get_last_day_close_sequence()
    return await ledger.get_events_since(boundary, limit=limit)


def _hour_label(h: int) -> str:
    """Convert 0-23 hour to '10:00' style label."""
    if h == 0:
        return "12:00"
    if h <= 12:
        return "%d:00" % h
    return "%d:00" % (h - 12)


def _aggregate_orders(orders, tip_map):
    """Shared aggregation logic for a set of orders."""
    net_sales = _ZERO
    gross_sales = _ZERO
    void_total = _ZERO
    discount_total = _ZERO
    cash_total = _ZERO
    card_total = _ZERO
    total_tips = _ZERO
    card_tips = _ZERO
    cash_tips = _ZERO
    total_checks = 0
    guest_count = 0
    table_set = set()
    hourly = {}  # hour -> {net, checks}

    for order in orders:
        if order.status == "voided":
            void_total += Decimal(str(order.subtotal))
            continue

        total_checks += 1
        gross_sales += Decimal(str(order.subtotal))
        discount_total += Decimal(str(order.discount_total))
        guest_count += order.guest_count
        if order.table:
            table_set.add(order.table)

        order_net = Decimal(str(order.subtotal)) - Decimal(str(order.discount_total))

        # Hourly bucket
        if order.created_at:
            h = order.created_at.hour
            if h not in hourly:
                hourly[h] = {"net": _ZERO, "checks": 0, "tables": set()}
            hourly[h]["net"] += order_net
            hourly[h]["checks"] += 1
            if order.table:
                hourly[h]["tables"].add(order.table)

        # Payment breakdown
        for p in order.payments:
            if p.status != "confirmed":
                continue
            tip = Decimal(str(tip_map.get(p.payment_id, p.tip_amount)))
            total_tips += tip
            if p.method == "cash":
                cash_total += Decimal(str(p.amount))
                cash_tips += tip
            else:
                card_total += Decimal(str(p.amount))
                card_tips += tip

    net_sales = gross_sales - void_total - discount_total

    return {
        "net_sales": net_sales,
        "total_checks": total_checks,
        "cash_total": cash_total,
        "card_total": card_total,
        "total_tips": total_tips,
        "card_tips": card_tips,
        "cash_tips": cash_tips,
        "guest_count": guest_count,
        "table_count": len(table_set),
        "hourly": hourly,
    }


# ── sales-summary ──────────────────────────────────────────────────────────

@router.get("/sales-summary")
async def get_sales_summary(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    server_id: Optional[str] = Query(None, description="Employee ID for server-specific view"),
    ledger: EventLedger = Depends(get_ledger),
):
    """
    Sales summary from real event ledger data.
    Manager view (no server_id) returns house-level stats.
    Server view (with server_id) returns individual stats with tip details.
    """
    all_events = await _get_current_day_events(ledger)
    all_orders = project_orders(all_events)

    # Build tip map (last-write-wins per payment_id)
    tip_map = {}
    for e in all_events:
        if e.event_type == EventType.TIP_ADJUSTED:
            tip_map[e.payload.get("payment_id")] = e.payload.get("tip_amount", 0.0)

    # Filter by server if requested
    orders = list(all_orders.values())
    if server_id:
        orders = [o for o in orders if o.server_id == server_id]

    agg = _aggregate_orders(orders, tip_map)
    net = float(agg["net_sales"])
    checks = agg["total_checks"]
    check_avg = money_round(net / checks) if checks > 0 else 0.0

    # Build hourly_sales sorted by hour
    hourly_sales = []
    for h in sorted(agg["hourly"].keys()):
        bucket = agg["hourly"][h]
        hourly_sales.append({
            "hour": _hour_label(h),
            "net": money_round(float(bucket["net"])),
            "checks": bucket["checks"],
        })

    base = {
        "date": date,
        "net_sales": money_round(net),
        "total_checks": checks,
        "check_avg": check_avg,
        "cash_total": money_round(float(agg["cash_total"])),
        "card_total": money_round(float(agg["card_total"])),
        "hourly_sales": hourly_sales,
        "last_week_hourly": [],       # no historical data available yet
        "daily_check_avg": [],        # no weekly trend data available yet
    }

    if server_id:
        # Server-specific fields
        tipout_rate = 0.02  # 2% tipout — matches labor-summary tipout_percent
        tips = float(agg["total_tips"])
        cash_t = float(agg["cash_tips"])
        card_t = float(agg["card_tips"])
        tipout = money_round(card_t * tipout_rate)
        take_home = money_round(tips - tipout)

        base["total_guests"] = agg["guest_count"]
        base["total_tables"] = agg["table_count"]
        base["guests_per_table"] = (
            round(agg["guest_count"] / agg["table_count"], 1)
            if agg["table_count"] > 0 else 0.0
        )
        base["tips_collected"] = money_round(tips)
        base["tipout_amount"] = tipout
        base["cash_tips"] = money_round(cash_t)
        base["take_home"] = take_home

        # Hourly tables
        hourly_tables = []
        for h in sorted(agg["hourly"].keys()):
            bucket = agg["hourly"][h]
            hourly_tables.append({
                "hour": _hour_label(h),
                "tables": len(bucket["tables"]),
            })
        base["hourly_tables"] = hourly_tables

    return base


# ── labor-summary ──────────────────────────────────────────────────────────

@router.get("/labor-summary")
async def get_labor_summary(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    server_id: Optional[str] = Query(None, description="Employee ID for server-specific view"),
    ledger: EventLedger = Depends(get_ledger),
):
    """
    Labor summary from real event ledger data.
    Clock-in/out times come from USER_LOGGED_IN/OUT events.
    Manager view returns house-level labor stats.
    Server view returns individual employee details.
    """
    # Get clock events
    login_events = await ledger.get_events_by_type(EventType.USER_LOGGED_IN)
    logout_events = await ledger.get_events_by_type(EventType.USER_LOGGED_OUT)

    # Build per-employee clock records: {eid: {name, clock_in, clock_out, hours}}
    clock_ins = {}   # eid -> latest login event
    clock_outs = {}  # eid -> latest logout event
    emp_names = {}   # eid -> name

    for e in sorted(login_events, key=lambda x: x.sequence_number or 0):
        eid = e.payload["employee_id"]
        clock_ins[eid] = e
        emp_names[eid] = e.payload["employee_name"]

    for e in sorted(logout_events, key=lambda x: x.sequence_number or 0):
        eid = e.payload["employee_id"]
        clock_outs[eid] = e
        emp_names[eid] = e.payload.get("employee_name", emp_names.get(eid, "Unknown"))

    # Also get order data for tip calculations
    all_events = await _get_current_day_events(ledger)
    all_orders = project_orders(all_events)

    tip_map = {}
    for e in all_events:
        if e.event_type == EventType.TIP_ADJUSTED:
            tip_map[e.payload.get("payment_id")] = e.payload.get("tip_amount", 0.0)

    now = datetime.now(timezone.utc)

    def _calc_hours(eid):
        """Calculate hours worked for an employee."""
        login_ev = clock_ins.get(eid)
        logout_ev = clock_outs.get(eid)
        if not login_ev:
            return 0.0
        start = login_ev.timestamp
        # If clocked out after clock in, use that; otherwise still on clock
        if logout_ev and logout_ev.timestamp > start:
            end = logout_ev.timestamp
        else:
            end = now
        delta = (end - start).total_seconds() / 3600.0
        return round(delta, 1)

    def _format_time(ev):
        """Format event timestamp as HH:MM."""
        if not ev:
            return None
        return ev.timestamp.strftime("%H:%M")

    def _is_clocked_in(eid):
        """Check if employee is currently clocked in."""
        login_ev = clock_ins.get(eid)
        logout_ev = clock_outs.get(eid)
        if not login_ev:
            return False
        if logout_ev and logout_ev.timestamp > login_ev.timestamp:
            return False
        return True

    if server_id:
        hours = _calc_hours(server_id)
        login_ev = clock_ins.get(server_id)
        logout_ev = clock_outs.get(server_id)

        clock_in_time = _format_time(login_ev)
        clock_out_time = None
        if logout_ev and login_ev and logout_ev.timestamp > login_ev.timestamp:
            clock_out_time = _format_time(logout_ev)

        return {
            "date": date,
            "clock_in": clock_in_time,
            "clock_out": clock_out_time,
            "today_hours": hours,
            "weekly_hours": hours,          # only today's data available
            "weekly_breakdown": [],         # no historical data available yet
            "ot_projected": hours,          # simple projection from current pace
            "ot_buffer": max(0.0, 40.0 - hours),
            "ot_status": "warning" if hours >= 8.0 else "ok",
        }

    # Manager view — aggregate all employees
    all_eids = set(list(clock_ins.keys()) + list(clock_outs.keys()))

    # Compute per-server tips from orders
    server_tips = {}  # eid -> total tips
    for order in all_orders.values():
        if order.status == "voided":
            continue
        sid = order.server_id
        if not sid:
            continue
        for p in order.payments:
            if p.status != "confirmed":
                continue
            tip = Decimal(str(tip_map.get(p.payment_id, p.tip_amount)))
            if sid not in server_tips:
                server_tips[sid] = _ZERO
            server_tips[sid] += tip

    total_hours = _ZERO
    card_tips_total = _ZERO
    employees = []

    for eid in all_eids:
        hours = _calc_hours(eid)
        tips = float(server_tips.get(eid, 0))
        total_hours += Decimal(str(hours))
        card_tips_total += Decimal(str(tips))

        employees.append({
            "id": eid,
            "name": emp_names.get(eid, "Unknown"),
            "hours": hours,
            "clock_in": _format_time(clock_ins.get(eid)),
            "clock_out": _format_time(clock_outs.get(eid)) if not _is_clocked_in(eid) else None,
            "tips": money_round(tips),
            "weekly_hours": hours,  # only today's data available
        })

    tipout_percent = 2
    tipout_deducted = money_round(float(card_tips_total) * tipout_percent / 100)
    tip_pool = money_round(float(card_tips_total) - tipout_deducted)

    # OT alerts: anyone at or over 8 hours today
    ot_alerts = []
    for emp in employees:
        if emp["hours"] >= 8.0:
            ot_alerts.append({
                "id": emp["id"],
                "name": emp["name"],
                "weekly_hours": emp["hours"],
                "projected": emp["hours"],  # simple same-day projection
                "status": "warning",
            })

    return {
        "date": date,
        "total_hours": money_round(float(total_hours)),
        "tip_pool": tip_pool,
        "card_tips_total": money_round(float(card_tips_total)),
        "tipout_percent": tipout_percent,
        "tipout_deducted": tipout_deducted,
        "cob_percent": 0.0,         # no expense data available yet
        "employees": employees,
        "ot_alerts": ot_alerts,
        "cob_trend": [],             # no historical data available yet
    }
