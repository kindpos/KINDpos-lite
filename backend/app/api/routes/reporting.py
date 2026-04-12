"""
Reporting API Routes

Endpoints for sales and labor reporting summaries.
Supports both current-day and historical date queries via the event ledger.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from app.api.dependencies import get_ledger
from app.core.event_ledger import EventLedger
from app.core.events import EventType
from app.core.projections import project_orders
from app.core.money import money_round
from app.config import settings as app_settings

router = APIRouter(prefix="/reports", tags=["reporting"])

_ZERO = Decimal("0")

# Revenue category map — items in these categories count as "Beverage"
_BEVERAGE_CATS = {"Drinks", "Soda", "Beverage"}


# ── helpers ─────────────────────────────────────────────────────────────────

async def _get_current_day_events(ledger: EventLedger, limit: int = 50000):
    """Get events since the last day close (current business day)."""
    boundary = await ledger.get_last_day_close_sequence()
    return await ledger.get_events_since(boundary, limit=limit)


async def _get_events_for_date(ledger: EventLedger, date_str: str, limit: int = 50000):
    """Get events for a specific date — uses date range query for historical,
    current-day query for today."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if date_str == today:
        return await _get_current_day_events(ledger, limit=limit)
    # Historical: query by date range
    next_day = (datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
    return await ledger.get_events_by_date_range(date_str, next_day, limit=limit)


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
    refund_total = _ZERO
    cash_total = _ZERO
    card_total = _ZERO
    total_tips = _ZERO
    card_tips = _ZERO
    cash_tips = _ZERO
    total_checks = 0
    guest_count = 0
    table_set = set()
    hourly = {}          # hour -> {net, checks, tables, food, drink, other}
    item_revenue = {}    # item_name -> {revenue, category, count}
    tip_amounts = []     # list of individual tip values

    for order in orders:
        if order.status == "voided":
            void_total += Decimal(str(order.subtotal))
            continue

        total_checks += 1
        gross_sales += Decimal(str(order.subtotal))
        discount_total += Decimal(str(order.discount_total))
        refund_total += Decimal(str(order.refund_total))
        guest_count += order.guest_count
        if order.table:
            table_set.add(order.table)

        order_net = Decimal(str(order.subtotal)) - Decimal(str(order.discount_total)) - Decimal(str(order.refund_total))

        # Per-item tracking
        food_total = _ZERO
        drink_total = _ZERO
        for item in order.items:
            item_sub = Decimal(str(item.subtotal))
            cat = item.category or ""
            if cat in _BEVERAGE_CATS:
                drink_total += item_sub
            else:
                food_total += item_sub

            # Top items tracking
            key = item.name
            if key not in item_revenue:
                item_revenue[key] = {"revenue": _ZERO, "category": cat, "count": 0}
            item_revenue[key]["revenue"] += item_sub
            item_revenue[key]["count"] += item.quantity

        other_total = order_net - food_total - drink_total
        if other_total < 0:
            other_total = _ZERO

        # Hourly bucket
        if order.created_at:
            h = order.created_at.hour
            if h not in hourly:
                hourly[h] = {"net": _ZERO, "checks": 0, "tables": set(),
                             "food": _ZERO, "drink": _ZERO, "other": _ZERO}
            hourly[h]["net"] += order_net
            hourly[h]["checks"] += 1
            hourly[h]["food"] += food_total
            hourly[h]["drink"] += drink_total
            hourly[h]["other"] += other_total
            if order.table:
                hourly[h]["tables"].add(order.table)

        # Payment breakdown
        for p in order.payments:
            if p.status != "confirmed":
                continue
            tip = Decimal(str(tip_map.get(p.payment_id, p.tip_amount)))
            total_tips += tip
            if float(tip) > 0:
                tip_amounts.append(float(tip))
            if p.method == "cash":
                cash_total += Decimal(str(p.amount))
                cash_tips += tip
            else:
                card_total += Decimal(str(p.amount))
                card_tips += tip

    net_sales = gross_sales - void_total - discount_total - refund_total

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
        "item_revenue": item_revenue,
        "tip_amounts": tip_amounts,
    }


def _build_top_items(item_revenue, limit=10):
    """Build top items list sorted by revenue descending."""
    sorted_items = sorted(item_revenue.items(), key=lambda x: x[1]["revenue"], reverse=True)
    return [
        {
            "name": name,
            "revenue": money_round(float(data["revenue"])),
            "category": data["category"],
            "count": data["count"],
        }
        for name, data in sorted_items[:limit]
    ]


def _build_tip_buckets(tip_amounts):
    """Build tip distribution histogram buckets."""
    ranges = [
        ("$0-3", 0, 3),
        ("$3-5", 3, 5),
        ("$5-8", 5, 8),
        ("$8-12", 8, 12),
        ("$12-15", 12, 15),
        ("$15-20", 15, 20),
        ("$20+", 20, 9999),
    ]
    buckets = []
    for label, lo, hi in ranges:
        count = sum(1 for t in tip_amounts if lo <= t < hi)
        buckets.append({"range": label, "count": count})
    return buckets


def _build_tip_map(events):
    """Build tip map from events (last-write-wins per payment_id)."""
    tip_map = {}
    for e in events:
        if e.event_type == EventType.TIP_ADJUSTED:
            tip_map[e.payload.get("payment_id")] = e.payload.get("tip_amount", 0.0)
    return tip_map


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
    all_events = await _get_events_for_date(ledger, date)
    all_orders = project_orders(all_events)
    tip_map = _build_tip_map(all_events)

    # Filter by server if requested
    orders = list(all_orders.values())
    if server_id:
        orders = [o for o in orders if o.server_id == server_id]

    agg = _aggregate_orders(orders, tip_map)
    net = float(agg["net_sales"])
    checks = agg["total_checks"]
    check_avg = money_round(net / checks) if checks > 0 else 0.0

    # Build hourly_sales sorted by hour — include food/drink/other breakdown
    hourly_sales = []
    for h in sorted(agg["hourly"].keys()):
        bucket = agg["hourly"][h]
        hourly_sales.append({
            "hour": _hour_label(h),
            "net": money_round(float(bucket["net"])),
            "checks": bucket["checks"],
            "food": money_round(float(bucket["food"])),
            "drink": money_round(float(bucket["drink"])),
            "other": money_round(float(bucket.get("other", 0))),
        })

    # ── Last week comparison ──────────────────────────────────────────────
    last_week_hourly = []
    try:
        lw_date = (datetime.strptime(date, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
        lw_events = await _get_events_for_date(ledger, lw_date)
        lw_orders = project_orders(lw_events)
        lw_tip_map = _build_tip_map(lw_events)
        lw_list = list(lw_orders.values())
        if server_id:
            lw_list = [o for o in lw_list if o.server_id == server_id]
        lw_agg = _aggregate_orders(lw_list, lw_tip_map)
        for h in sorted(lw_agg["hourly"].keys()):
            bucket = lw_agg["hourly"][h]
            last_week_hourly.append({
                "hour": _hour_label(h),
                "net": money_round(float(bucket["net"])),
                "checks": bucket["checks"],
            })
    except Exception:
        pass

    # ── Top items ─────────────────────────────────────────────────────────
    top_items = _build_top_items(agg["item_revenue"])

    # ── Peak hours heatmap (past 7 days) ──────────────────────────────────
    peak_hours = []
    try:
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        target_date = datetime.strptime(date, "%Y-%m-%d")
        # Build grid for each of the last 7 days ending on target_date
        for i in range(6, -1, -1):
            d = target_date - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            d_events = await _get_events_for_date(ledger, d_str)
            d_orders = project_orders(d_events)
            d_tip_map = _build_tip_map(d_events)
            d_list = list(d_orders.values())
            if server_id:
                d_list = [o for o in d_list if o.server_id == server_id]
            d_agg = _aggregate_orders(d_list, d_tip_map)
            hours_data = []
            for h in range(11, 23):  # 11am to 10pm
                bucket = d_agg["hourly"].get(h, {})
                hours_data.append({"hour": h, "value": bucket.get("checks", 0) if isinstance(bucket, dict) and "checks" in bucket else 0})
            peak_hours.append({
                "day": day_names[d.weekday()],
                "hours": hours_data,
            })
    except Exception:
        pass

    # ── Tip buckets ───────────────────────────────────────────────────────
    tip_buckets = _build_tip_buckets(agg["tip_amounts"])
    tip_avg = money_round(sum(agg["tip_amounts"]) / len(agg["tip_amounts"])) if agg["tip_amounts"] else 0.0

    base = {
        "date": date,
        "net_sales": money_round(net),
        "total_checks": checks,
        "check_avg": check_avg,
        "cash_total": money_round(float(agg["cash_total"])),
        "card_total": money_round(float(agg["card_total"])),
        "hourly_sales": hourly_sales,
        "last_week_hourly": last_week_hourly,
        "top_items": top_items,
        "peak_hours": peak_hours,
        "tip_buckets": tip_buckets,
        "tip_avg": tip_avg,
        "daily_check_avg": [],
    }

    if server_id:
        # Server-specific fields
        tipout_rate = app_settings.tipout_percent / 100.0
        tips = float(agg["total_tips"])
        cash_t = float(agg["cash_tips"])
        card_t = float(agg["card_tips"])
        tipout = money_round(tips * tipout_rate)
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
    # Get clock events for the requested date
    day_events = await _get_events_for_date(ledger, date)

    # Filter login/logout events for this day
    clock_ins = {}   # eid -> login event
    clock_outs = {}  # eid -> logout event
    emp_names = {}   # eid -> name

    for e in sorted(day_events, key=lambda x: x.sequence_number or 0):
        if e.event_type == EventType.USER_LOGGED_IN:
            eid = e.payload["employee_id"]
            clock_ins[eid] = e
            emp_names[eid] = e.payload["employee_name"]
        elif e.event_type == EventType.USER_LOGGED_OUT:
            eid = e.payload["employee_id"]
            clock_outs[eid] = e
            emp_names[eid] = e.payload.get("employee_name", emp_names.get(eid, "Unknown"))

    # Also get order data for tip calculations
    all_orders = project_orders(day_events)
    tip_map = _build_tip_map(day_events)

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    def _calc_hours(eid):
        """Calculate hours worked for an employee."""
        login_ev = clock_ins.get(eid)
        logout_ev = clock_outs.get(eid)
        if not login_ev:
            return 0.0
        start = login_ev.timestamp
        if logout_ev and logout_ev.timestamp > start:
            end = logout_ev.timestamp
        elif date == today_str:
            end = now  # still on clock today
        else:
            # Historical day without clock-out: assume 8 hour shift
            end = start + timedelta(hours=8)
        delta = (end - start).total_seconds() / 3600.0
        return round(delta, 1)

    def _format_time(ev):
        if not ev:
            return None
        return ev.timestamp.strftime("%H:%M")

    def _is_clocked_in(eid):
        login_ev = clock_ins.get(eid)
        logout_ev = clock_outs.get(eid)
        if not login_ev:
            return False
        if logout_ev and logout_ev.timestamp > login_ev.timestamp:
            return False
        if date != today_str:
            return False  # historical days are always "clocked out"
        return True

    # ── Weekly hours: sum hours from past 7 days ──────────────────────────
    async def _get_weekly_hours(eid):
        """Sum hours for an employee over the past 7 days."""
        total = 0.0
        target = datetime.strptime(date, "%Y-%m-%d")
        for i in range(7):
            d = target - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            if d_str == date:
                total += _calc_hours(eid)
                continue
            d_events = await _get_events_for_date(ledger, d_str)
            d_login = None
            d_logout = None
            for e in d_events:
                if e.event_type == EventType.USER_LOGGED_IN and e.payload["employee_id"] == eid:
                    d_login = e
                elif e.event_type == EventType.USER_LOGGED_OUT and e.payload["employee_id"] == eid:
                    d_logout = e
            if d_login:
                start = d_login.timestamp
                end = d_logout.timestamp if (d_logout and d_logout.timestamp > start) else start + timedelta(hours=8)
                total += round((end - start).total_seconds() / 3600.0, 1)
        return round(total, 1)

    # ── Weekly breakdown (for server view) ────────────────────────────────
    async def _get_weekly_breakdown(eid):
        """Build daily hours breakdown for the past 7 days."""
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        breakdown = []
        target = datetime.strptime(date, "%Y-%m-%d")
        for i in range(6, -1, -1):
            d = target - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            d_in = None
            d_out = None
            d_hours = 0.0
            if d_str == date:
                login_ev = clock_ins.get(eid)
                logout_ev = clock_outs.get(eid)
                d_in = _format_time(login_ev)
                d_out = _format_time(logout_ev) if (logout_ev and login_ev and logout_ev.timestamp > login_ev.timestamp) else None
                d_hours = _calc_hours(eid)
            else:
                d_events = await _get_events_for_date(ledger, d_str)
                for e in d_events:
                    if e.event_type == EventType.USER_LOGGED_IN and e.payload["employee_id"] == eid:
                        d_in = e.timestamp.strftime("%H:%M")
                        start_ts = e.timestamp
                    elif e.event_type == EventType.USER_LOGGED_OUT and e.payload["employee_id"] == eid:
                        d_out = e.timestamp.strftime("%H:%M")
                if d_in:
                    if d_out:
                        start_ts_obj = datetime.strptime(d_in, "%H:%M")
                        end_ts_obj = datetime.strptime(d_out, "%H:%M")
                        d_hours = round((end_ts_obj - start_ts_obj).total_seconds() / 3600.0, 1)
                        if d_hours < 0:
                            d_hours = 0.0
                    else:
                        d_hours = 8.0
            breakdown.append({
                "day": day_names[d.weekday()],
                "hours": d_hours,
                "in": d_in,
                "out": d_out,
            })
        return breakdown

    if server_id:
        hours = _calc_hours(server_id)
        weekly_hours = await _get_weekly_hours(server_id)
        weekly_breakdown = await _get_weekly_breakdown(server_id)
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
            "weekly_hours": weekly_hours,
            "weekly_breakdown": weekly_breakdown,
            "ot_projected": weekly_hours,
            "ot_buffer": max(0.0, 40.0 - weekly_hours),
            "ot_status": "warning" if weekly_hours >= 35.0 else "ok",
        }

    # Manager view — aggregate all employees
    all_eids = set(list(clock_ins.keys()) + list(clock_outs.keys()))

    # Compute per-server tips from orders
    server_tips = {}
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
        weekly_hours = await _get_weekly_hours(eid)
        total_hours += Decimal(str(hours))
        card_tips_total += Decimal(str(tips))

        employees.append({
            "id": eid,
            "name": emp_names.get(eid, "Unknown"),
            "hours": hours,
            "clock_in": _format_time(clock_ins.get(eid)),
            "clock_out": _format_time(clock_outs.get(eid)) if not _is_clocked_in(eid) else None,
            "tips": money_round(tips),
            "weekly_hours": weekly_hours,
        })

    tipout_percent = app_settings.tipout_percent
    total_tips_all = sum(Decimal(str(emp.get("tips", 0))) for emp in employees)
    tipout_deducted = money_round(float(total_tips_all) * tipout_percent / 100)
    tip_pool = money_round(float(total_tips_all) - tipout_deducted)

    # OT alerts: anyone at or over 35 weekly hours
    ot_alerts = []
    for emp in employees:
        if emp["weekly_hours"] >= 35.0:
            ot_alerts.append({
                "id": emp["id"],
                "name": emp["name"],
                "weekly_hours": emp["weekly_hours"],
                "projected": emp["weekly_hours"],
                "status": "critical" if emp["weekly_hours"] > 40 else "warning",
            })

    # ── COB trend (past 7 days) ───────────────────────────────────────────
    cob_trend = []
    try:
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        target = datetime.strptime(date, "%Y-%m-%d")
        for i in range(6, -1, -1):
            d = target - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            # Get sales for the day
            d_events = await _get_events_for_date(ledger, d_str)
            d_orders = project_orders(d_events)
            d_tip_map = _build_tip_map(d_events)
            d_agg = _aggregate_orders(list(d_orders.values()), d_tip_map)
            d_sales = float(d_agg["net_sales"])

            # Get labor hours and cost for the day
            d_labor_hours = 0.0
            d_logins = {}
            d_logouts = {}
            for e in d_events:
                if e.event_type == EventType.USER_LOGGED_IN:
                    d_logins[e.payload["employee_id"]] = e
                elif e.event_type == EventType.USER_LOGGED_OUT:
                    d_logouts[e.payload["employee_id"]] = e
            for eid, login_ev in d_logins.items():
                logout_ev = d_logouts.get(eid)
                start = login_ev.timestamp
                end = logout_ev.timestamp if (logout_ev and logout_ev.timestamp > start) else start + timedelta(hours=8)
                d_labor_hours += (end - start).total_seconds() / 3600.0

            # Estimate labor cost at $15/hr average
            labor_cost = d_labor_hours * 15.0
            cob_pct = round(labor_cost / d_sales * 100, 1) if d_sales > 0 else 0.0
            cob_trend.append({
                "day": day_names[d.weekday()],
                "percent": cob_pct,
            })
    except Exception:
        pass

    return {
        "date": date,
        "total_hours": money_round(float(total_hours)),
        "tip_pool": tip_pool,
        "card_tips_total": money_round(float(card_tips_total)),
        "tipout_percent": tipout_percent,
        "tipout_deducted": tipout_deducted,
        "cob_percent": cob_trend[-1]["percent"] if cob_trend else 0.0,
        "employees": employees,
        "ot_alerts": ot_alerts,
        "cob_trend": cob_trend,
    }


# =============================================================================
# HOURLY SALES COMPARISON (today vs last week)
# =============================================================================

@router.get("/hourly-compare")
async def hourly_compare(
    date: Optional[str] = None,
    ledger: EventLedger = Depends(get_ledger),
):
    """Return hourly sales for a given date and the same weekday last week.

    Response: { today: [{ hour, net_sales }], last_week: [{ hour, net_sales }] }
    Used by the manager-landing Sales Overview sparkline.
    """
    if date:
        target = datetime.strptime(date, "%Y-%m-%d")
    else:
        target = datetime.now(timezone.utc)

    compare_date = target - timedelta(days=7)
    target_str = target.strftime("%Y-%m-%d")
    compare_str = compare_date.strftime("%Y-%m-%d")

    today_hourly = await _hourly_for_date(ledger, target_str)
    last_week_hourly = await _hourly_for_date(ledger, compare_str)

    return {
        "today": today_hourly,
        "last_week": last_week_hourly,
    }


async def _hourly_for_date(ledger: EventLedger, date_str: str):
    """Build hourly net sales array for a date."""
    events = await _get_events_for_date(ledger, date_str)
    orders = project_orders(events)

    hourly = defaultdict(lambda: Decimal("0"))
    for order in orders:
        if order.status == "voided":
            continue
        ts = order.created_at
        if ts:
            h = ts.hour if hasattr(ts, 'hour') else 0
        else:
            h = 0
        hourly[h] += Decimal(str(order.subtotal or 0))

    result = []
    for h in range(6, 24):
        ampm = 'p' if h >= 12 else 'a'
        label = str(h - 12 if h > 12 else h) + ampm
        result.append({
            "hour": label,
            "net_sales": money_round(float(hourly[h])),
        })

    return result
