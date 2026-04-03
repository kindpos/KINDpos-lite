"""
KINDpos Live Print Test — Server Checkout + Sales Recap
Sends rendered templates to the receipt printer at 10.0.0.186:9100

Run from project root:
    python print_live_test.py
"""

import sys
import socket

RECEIPT_PRINTER_IP = "10.0.0.186"
PRINTER_PORT = 9100
TIMEOUT = 5

# ── Import templates + formatter ──────────────────────────────────────
try:
    from backend.app.printing.templates.server_checkout import ServerCheckoutTemplate
    from backend.app.printing.templates.sales_recap import SalesRecapTemplate
    print("✅ Templates imported")
except ImportError:
    from app.printing.templates.server_checkout import ServerCheckoutTemplate
    from app.printing.templates.sales_recap import SalesRecapTemplate
    print("✅ Templates imported (app.*)")

try:
    from backend.app.printing.escpos_formatter import ESCPOSFormatter
    print("✅ ESCPOSFormatter imported")
except ImportError:
    try:
        from app.printing.escpos_formatter import ESCPOSFormatter
        print("✅ ESCPOSFormatter imported (app.*)")
    except ImportError:
        # Try other common locations
        try:
            from backend.app.printing.formatter import ESCPOSFormatter
            print("✅ ESCPOSFormatter imported (formatter)")
        except ImportError:
            print("❌ Cannot find ESCPOSFormatter — check the import path")
            print("   Try running from the backend/ directory or project root")
            print("   Look for the file: find . -name '*.py' | findstr /i escpos")
            sys.exit(1)


# ── Mock contexts (same as test) ──────────────────────────────────────

SERVER_CHECKOUT_CONTEXT = {
    "restaurant_name":     "Tony's Taco Truck",
    "server_name":         "Alex",
    "date":                "04/02/2026",
    "clock_in":            "2026-04-02T10:00:00Z",
    "clock_out":           "2026-04-02T18:30:00Z",
    "shift_duration":      "8h 30m",
    "checks_closed":       24,
    "gross_sales":         1842.50,
    "voids_total":         15.00,
    "comps_total":         28.00,
    "discounts_total":     0.0,
    "net_sales":           1799.50,
    "tax_collected":       126.97,
    "cash_sales":          622.00,
    "card_sales":          1177.50,
    "show_cc_detail":      True,
    "cc_transactions": [
        {"check_number": "C-003", "card_last_four": "4242", "total": 87.50,  "tip": 17.50,  "tip_open": False},
        {"check_number": "C-005", "card_last_four": "1234", "total": 142.00, "tip": 28.00,  "tip_open": False},
        {"check_number": "C-008", "card_last_four": "5678", "total": 63.00,  "tip": 12.00,  "tip_open": False},
        {"check_number": "C-011", "card_last_four": "9999", "total": 225.00, "tip": 0.00,   "tip_open": True},
        {"check_number": "C-014", "card_last_four": "3333", "total": 98.00,  "tip": 18.00,  "tip_open": False},
        {"check_number": "C-017", "card_last_four": "7777", "total": 312.00, "tip": 55.00,  "tip_open": False},
        {"check_number": "C-020", "card_last_four": "1111", "total": 250.00, "tip": 45.00,  "tip_open": False},
    ],
    "cc_tips_total":       175.50,
    "declared_cash_tips":  47.00,
    "gross_tips":          222.50,
    "tip_pool":            None,
    "tip_outs": [
        {"role": "Bar",         "basis_description": "10% alc sales", "amount": 12.40, "adjusted": False, "not_staffed": False},
        {"role": "Busser",      "basis_description": "3% net sales",  "amount": 53.99, "adjusted": False, "not_staffed": False},
        {"role": "Food Runner", "basis_description": "2% food sales", "amount": 0.00,  "adjusted": False, "not_staffed": True},
    ],
    "total_tip_out":       66.39,
    "net_tips":            156.11,
    "cash_collected":      622.00,
    "cc_tips_payout":      "cash",
    "open_tip_count":      1,
    "require_manager_sign": True,
}

SALES_RECAP_CONTEXT = {
    "restaurant_name":  "Tony's Taco Truck",
    "date":             "04/02/2026",
    "date_from":        "04/02/2026",
    "date_to":          "",
    "printed_by":       "Alex (Manager)",
    "printed_at":       "2026-04-02T23:15:00Z",
    "gross_sales":      4285.00,
    "voids_total":      45.00,
    "voids_count":      3,
    "comps_total":      72.00,
    "comps_count":      2,
    "discounts_total":  35.00,
    "discounts_count":  5,
    "net_sales":        4133.00,
    "tax_collected":    289.31,
    "tax_lines":        [{"label": "FL Sales Tax 7%", "amount": 289.31}],
    "cash_sales":       1480.00,
    "cash_count":       38,
    "card_sales":       2653.00,
    "card_count":       52,
    "other_payments":   [],
    "total_payments":   4133.00,
    "total_tips":       612.40,
    "category_sales": [
        {"name": "Tacos",       "total": 1650.00, "count": 330},
        {"name": "Burritos",    "total": 980.00,  "count": 98},
        {"name": "Drinks",      "total": 720.00,  "count": 240},
        {"name": "Sides",       "total": 485.00,  "count": 194},
        {"name": "Desserts",    "total": 298.00,  "count": 74},
    ],
    "total_checks":     90,
    "avg_check":        45.92,
    "covers":           142,
    "per_person_avg":   29.11,
    "dayparts": [
        {"name": "Lunch (11a-3p)",    "sales": 2180.00, "checks": 48},
        {"name": "Dinner (3p-9p)",    "sales": 1953.00, "checks": 42},
    ],
    "terminal_id":      "T-001",
}


# ── Send bytes to printer ─────────────────────────────────────────────

def send_to_printer(data: bytes, ip: str, port: int = PRINTER_PORT, label: str = ""):
    """Send raw ESC/POS bytes to a thermal printer via TCP socket."""
    print(f"\n📠 Sending {label} to {ip}:{port} ({len(data)} bytes)...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(TIMEOUT)
        sock.connect((ip, port))
        sock.sendall(data)
        sock.close()
        print(f"   ✅ {label} sent successfully!")
        return True
    except socket.timeout:
        print(f"   ❌ Connection timed out — is {ip} powered on?")
        return False
    except ConnectionRefusedError:
        print(f"   ❌ Connection refused — printer at {ip} not accepting connections")
        return False
    except OSError as e:
        print(f"   ❌ Network error: {e}")
        return False


# ── Main ──────────────────────────────────────────────────────────────

def main():
    formatter = ESCPOSFormatter(paper_width=80)

    # 1. Server Checkout
    print("\n" + "=" * 50)
    print(" PRINTING: Server Checkout")
    print("=" * 50)
    checkout_template = ServerCheckoutTemplate(paper_width=80)
    checkout_cmds = checkout_template.render(SERVER_CHECKOUT_CONTEXT)
    print(f"  Commands: {len(checkout_cmds)}")

    checkout_bytes = formatter.format(checkout_cmds)
    print(f"  Bytes: {len(checkout_bytes)}")
    ok1 = send_to_printer(checkout_bytes, RECEIPT_PRINTER_IP, label="Server Checkout")

    if not ok1:
        print("\n⚠️  Printer unreachable — aborting second print")
        sys.exit(1)

    # Small pause between prints
    import time
    time.sleep(2)

    # 2. Sales Recap
    print("\n" + "=" * 50)
    print(" PRINTING: Sales Recap")
    print("=" * 50)
    recap_template = SalesRecapTemplate(paper_width=80)
    recap_cmds = recap_template.render(SALES_RECAP_CONTEXT)
    print(f"  Commands: {len(recap_cmds)}")

    recap_bytes = formatter.format(recap_cmds)
    print(f"  Bytes: {len(recap_bytes)}")
    ok2 = send_to_printer(recap_bytes, RECEIPT_PRINTER_IP, label="Sales Recap")

    # Summary
    print("\n" + "=" * 50)
    if ok1 and ok2:
        print(" ✅ Both receipts printed successfully!")
    else:
        print(" ⚠️  Some prints failed — check output above")
    print("=" * 50)


if __name__ == "__main__":
    main()