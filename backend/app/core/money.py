"""
KINDpos Monetary Precision Utilities

Single rounding policy for all currency math: ROUND_HALF_UP to 2 decimal places.
This matches industry standard (customers expect $X.XX5 to round UP).

Usage:
    from app.core.money import money_round, money_float
    total = money_round(subtotal * tax_rate)   # → Decimal
    json_val = money_float(total)              # → float (for JSON only)
"""

from decimal import Decimal, ROUND_HALF_UP

_TWO_DP = Decimal("0.01")


def money_round(value) -> Decimal:
    """Round a monetary value to 2 decimal places using ROUND_HALF_UP.

    Returns Decimal to preserve precision through chained arithmetic.
    Converts through Decimal(str(...)) to avoid IEEE 754 representation
    errors (e.g., Decimal(0.1) != Decimal('0.1')).
    """
    if isinstance(value, Decimal):
        return value.quantize(_TWO_DP, rounding=ROUND_HALF_UP)
    return Decimal(str(value)).quantize(_TWO_DP, rounding=ROUND_HALF_UP)


def money_float(value) -> float:
    """Convert a monetary value to float for JSON serialization.

    Always rounds first to ensure 2dp precision.
    Use money_round() for all arithmetic; use this ONLY at serialization boundaries.
    """
    return float(money_round(value))


def money_str(value) -> str:
    """Format a monetary value as a 2dp string (e.g., '12.50').

    Safe for API responses and display.
    """
    return str(money_round(value))
