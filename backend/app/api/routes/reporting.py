"""
Reporting API Routes

Endpoints for sales and labor reporting summaries.
All data is currently hardcoded mock data.
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/reports", tags=["reporting"])


@router.get("/sales-summary")
async def get_sales_summary(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    server_id: Optional[str] = Query(None, description="Employee ID for server-specific view"),
):
    """
    Get sales summary for a given date.
    Manager view (no server_id) returns house-level stats.
    Server view (with server_id) returns individual stats with tip details.
    """
    # TODO: wire to real event ledger data
    base = {
        "date": date,
        "net_sales": 2847.50,  # TODO: wire to real event ledger data
        "total_checks": 47,  # TODO: wire to real event ledger data
        "check_avg": 60.59,  # TODO: wire to real event ledger data
        "cash_total": 1023.00,  # TODO: wire to real event ledger data
        "card_total": 1824.50,  # TODO: wire to real event ledger data
        "hourly_sales": [  # TODO: wire to real event ledger data
            {"hour": "10:00", "net": 185.00, "checks": 4},
            {"hour": "11:00", "net": 320.50, "checks": 8},
            {"hour": "12:00", "net": 580.00, "checks": 12},
            {"hour": "13:00", "net": 620.00, "checks": 10},
            {"hour": "14:00", "net": 340.00, "checks": 6},
            {"hour": "15:00", "net": 210.00, "checks": 3},
            {"hour": "16:00", "net": 180.00, "checks": 2},
            {"hour": "17:00", "net": 332.00, "checks": 2},
        ],
        "last_week_hourly": [  # TODO: wire to real event ledger data
            {"hour": "10:00", "net": 210.00, "checks": 5},
            {"hour": "11:00", "net": 350.00, "checks": 9},
            {"hour": "12:00", "net": 540.00, "checks": 11},
            {"hour": "13:00", "net": 600.00, "checks": 11},
            {"hour": "14:00", "net": 360.00, "checks": 7},
            {"hour": "15:00", "net": 230.00, "checks": 4},
            {"hour": "16:00", "net": 190.00, "checks": 3},
            {"hour": "17:00", "net": 350.00, "checks": 3},
        ],
        "daily_check_avg": [  # TODO: wire to real event ledger data
            {"day": "Mon", "avg": 55.20, "house_avg": 58.00},
            {"day": "Tue", "avg": 62.10, "house_avg": 59.50},
            {"day": "Wed", "avg": 58.80, "house_avg": 57.20},
            {"day": "Thu", "avg": 64.30, "house_avg": 60.00},
            {"day": "Fri", "avg": 60.59, "house_avg": 59.80},
            {"day": "Sat", "avg": 67.40, "house_avg": 61.20},
            {"day": "Sun", "avg": 63.00, "house_avg": 60.50},
        ],
    }

    if server_id:
        # TODO: wire to real event ledger data
        base["total_guests"] = 68
        base["total_tables"] = 16
        base["guests_per_table"] = 4.3
        base["tips_collected"] = 145.50
        base["tipout_amount"] = 24.90
        base["cash_tips"] = 38.00
        base["take_home"] = 120.60
        base["hourly_tables"] = [  # TODO: wire to real event ledger data
            {"hour": "10:00", "tables": 1},
            {"hour": "11:00", "tables": 2},
            {"hour": "12:00", "tables": 4},
            {"hour": "13:00", "tables": 4},
            {"hour": "14:00", "tables": 3},
            {"hour": "15:00", "tables": 2},
        ]

    return base
