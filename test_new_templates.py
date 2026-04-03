"""
KINDpos Template Tests — Server Checkout + Sales Recap
Run from project root:
    python -m pytest test_new_templates.py -v
    OR
    python test_new_templates.py
"""

import sys
import json

# ── Valid command types the ESCPOSFormatter expects ─────────────────────
VALID_TYPES = {"text", "feed", "divider", "cut"}
VALID_ALIGNS = {"left", "center", "right", None}


def validate_commands(commands, template_name):
    """Validate that every command dict has the right shape."""
    errors = []
    for i, cmd in enumerate(commands):
        if not isinstance(cmd, dict):
            errors.append(f"  [{i}] Not a dict: {type(cmd)}")
            continue
        if "type" not in cmd:
            errors.append(f"  [{i}] Missing 'type' key: {cmd}")
            continue
        if cmd["type"] not in VALID_TYPES:
            errors.append(f"  [{i}] Unknown type '{cmd['type']}': {cmd}")
        if cmd["type"] == "text" and "content" not in cmd:
            errors.append(f"  [{i}] Text command missing 'content': {cmd}")
        if cmd.get("align") not in VALID_ALIGNS:
            errors.append(f"  [{i}] Invalid align '{cmd.get('align')}': {cmd}")

    if errors:
        print(f"\n❌ {template_name} — {len(errors)} validation errors:")
        for e in errors:
            print(e)
        return False
    return True


def print_receipt_preview(commands, width=48):
    """Render a rough ASCII preview of what the thermal printer would output."""
    for cmd in commands:
        if cmd["type"] == "feed":
            print("\n" * cmd.get("lines", 1), end="")
        elif cmd["type"] == "divider":
            char = cmd.get("char", "-")
            print(char * width)
        elif cmd["type"] == "cut":
            print(f"\n{'✂' * 24}")
        elif cmd["type"] == "text":
            content = cmd.get("content", "")
            align = cmd.get("align", "left")
            bold = cmd.get("bold", False)
            dbl_w = cmd.get("double_width", False)
            dbl_h = cmd.get("double_height", False)
            reverse = cmd.get("reverse", False)

            # Flags for visual reference
            flags = ""
            if bold:    flags += "[B]"
            if dbl_w:   flags += "[2W]"
            if dbl_h:   flags += "[2H]"
            if reverse: flags += "[INV]"

            if align == "center":
                display_width = width // 2 if dbl_w else width
                content = content.center(display_width)
            elif align == "right":
                display_width = width // 2 if dbl_w else width
                content = content.rjust(display_width)

            print(f"{flags}{content}")


# ═══════════════════════════════════════════════════════════════════════
#  MOCK CONTEXTS
# ═══════════════════════════════════════════════════════════════════════

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

SERVER_CHECKOUT_POOL_CONTEXT = {
    **SERVER_CHECKOUT_CONTEXT,
    "server_name":    "Devon",
    "tip_pool": {
        "name":           "BAR POOL",
        "tips_collected":  185.00,
    },
    "tip_outs": [
        {"role": "Busser", "basis_description": "3% net sales", "amount": 53.99, "adjusted": False, "not_staffed": False},
    ],
    "total_tip_out":  53.99,
    "open_tip_count": 0,
}

SERVER_CHECKOUT_NOT_CLOCKED_OUT = {
    **SERVER_CHECKOUT_CONTEXT,
    "server_name": "Late Larry",
    "clock_out":   None,
    "shift_duration": "",
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


# ═══════════════════════════════════════════════════════════════════════
#  TEST RUNNER
# ═══════════════════════════════════════════════════════════════════════

def run_tests():
    # Try importing from the actual project structure
    try:
        from backend.app.printing.templates.server_checkout import ServerCheckoutTemplate
        from backend.app.printing.templates.sales_recap import SalesRecapTemplate
        print("✅ Imports successful (backend.app.printing.templates)\n")
    except ImportError:
        try:
            from app.printing.templates.server_checkout import ServerCheckoutTemplate
            from app.printing.templates.sales_recap import SalesRecapTemplate
            print("✅ Imports successful (app.printing.templates)\n")
        except ImportError as e:
            print(f"❌ Import failed: {e}")
            print("   Run from project root or backend/ directory")
            sys.exit(1)

    all_passed = True

    # ── Test 1: Server Checkout — standard ────────────────────────────────
    print("=" * 60)
    print(" TEST 1: Server Checkout (standard)")
    print("=" * 60)
    t = ServerCheckoutTemplate(paper_width=80)
    cmds = t.render(SERVER_CHECKOUT_CONTEXT)
    valid = validate_commands(cmds, "ServerCheckout-standard")
    print(f"  Commands generated: {len(cmds)}")
    assert len(cmds) > 20, "Too few commands — template may be broken"

    # Verify key content exists
    all_text = " ".join(c.get("content", "") for c in cmds if c["type"] == "text")
    assert "SERVER CHECKOUT" in all_text, "Missing SERVER CHECKOUT header"
    assert "SALES SUMMARY" in all_text, "Missing SALES SUMMARY section"
    assert "CC DETAIL" in all_text, "Missing CC DETAIL section"
    assert "TIP SUMMARY" in all_text, "Missing TIP SUMMARY section"
    assert "TIP OUT" in all_text, "Missing TIP OUT section"
    assert "CASH RECONCILIATION" in all_text, "Missing CASH RECONCILIATION section"
    assert "CASH DUE" in all_text or "SETTLED" in all_text or "DUE TO SERVER" in all_text, "Missing cash due line"
    assert "1 OPEN TIP" in all_text, "Missing open tip warning"
    assert "*N/S" in all_text, "Missing not-staffed flag"

    # Verify double-width on cash due line
    cash_due_cmds = [c for c in cmds if c.get("double_width") and "CASH" in c.get("content", "")]
    assert len(cash_due_cmds) >= 1, "Cash due line missing double_width flag"

    # Verify cut at end
    assert cmds[-1]["type"] == "cut", "Missing cut at end"

    if valid:
        print("  ✅ All assertions passed")
        print("\n  --- PREVIEW ---")
        print_receipt_preview(cmds)
    else:
        all_passed = False

    # ── Test 2: Server Checkout — pool member ─────────────────────────────
    print("\n" + "=" * 60)
    print(" TEST 2: Server Checkout (tip pool member)")
    print("=" * 60)
    cmds2 = t.render(SERVER_CHECKOUT_POOL_CONTEXT)
    valid2 = validate_commands(cmds2, "ServerCheckout-pool")
    print(f"  Commands generated: {len(cmds2)}")

    all_text2 = " ".join(c.get("content", "") for c in cmds2 if c["type"] == "text")
    assert "BAR POOL" in all_text2, "Missing pool name"
    assert "Pool settles at Close Day" in all_text2, "Missing pool settlement note"
    assert "CC tips settle with pool" in all_text2, "Missing pool cash recon note"

    if valid2:
        print("  ✅ All assertions passed")
        print("\n  --- PREVIEW ---")
        print_receipt_preview(cmds2)
    else:
        all_passed = False

    # ── Test 3: Server Checkout — not clocked out ─────────────────────────
    print("\n" + "=" * 60)
    print(" TEST 3: Server Checkout (not clocked out)")
    print("=" * 60)
    cmds3 = t.render(SERVER_CHECKOUT_NOT_CLOCKED_OUT)
    valid3 = validate_commands(cmds3, "ServerCheckout-no-clockout")

    all_text3 = " ".join(c.get("content", "") for c in cmds3 if c["type"] == "text")
    assert "NOT CLOCKED OUT" in all_text3, "Missing clock-out warning"

    if valid3:
        print("  ✅ All assertions passed")
    else:
        all_passed = False

    # ── Test 4: Sales Recap ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(" TEST 4: Sales Recap")
    print("=" * 60)
    sr = SalesRecapTemplate(paper_width=80)
    cmds4 = sr.render(SALES_RECAP_CONTEXT)
    valid4 = validate_commands(cmds4, "SalesRecap")
    print(f"  Commands generated: {len(cmds4)}")
    assert len(cmds4) > 20, "Too few commands — template may be broken"

    all_text4 = " ".join(c.get("content", "") for c in cmds4 if c["type"] == "text")
    assert "SALES RECAP" in all_text4, "Missing SALES RECAP header"
    assert "REVENUE" in all_text4, "Missing REVENUE section"
    assert "PAYMENTS" in all_text4, "Missing PAYMENTS section"
    assert "SALES BY CATEGORY" in all_text4, "Missing category section"
    assert "CHECK STATS" in all_text4, "Missing check stats"
    assert "DAYPART BREAKDOWN" in all_text4, "Missing daypart section"
    assert "CONFIDENTIAL" in all_text4, "Missing confidential footer"
    assert "Tacos" in all_text4, "Missing category data"

    # Verify NET SALES has double_height
    net_cmds = [c for c in cmds4 if c.get("double_height") and "NET" in c.get("content", "")]
    assert len(net_cmds) >= 1, "NET SALES line missing double_height flag"

    assert cmds4[-1]["type"] == "cut", "Missing cut at end"

    if valid4:
        print("  ✅ All assertions passed")
        print("\n  --- PREVIEW ---")
        print_receipt_preview(cmds4)
    else:
        all_passed = False

    # ── Test 5: Sales Recap — empty day ───────────────────────────────────
    print("\n" + "=" * 60)
    print(" TEST 5: Sales Recap (empty day — no sales)")
    print("=" * 60)
    empty_ctx = {
        "restaurant_name": "Empty Truck",
        "date": "04/02/2026",
        "date_from": "04/02/2026",
        "printed_at": "2026-04-02T23:00:00Z",
        "gross_sales": 0.0, "voids_total": 0.0, "comps_total": 0.0,
        "discounts_total": 0.0, "net_sales": 0.0, "tax_collected": 0.0,
        "cash_sales": 0.0, "cash_count": 0, "card_sales": 0.0, "card_count": 0,
        "total_payments": 0.0, "total_checks": 0, "avg_check": 0.0,
        "covers": 0, "per_person_avg": 0.0,
        "category_sales": [], "dayparts": [], "tax_lines": [],
    }
    cmds5 = sr.render(empty_ctx)
    valid5 = validate_commands(cmds5, "SalesRecap-empty")
    assert cmds5[-1]["type"] == "cut", "Missing cut on empty report"

    if valid5:
        print(f"  Commands generated: {len(cmds5)}")
        print("  ✅ Empty day renders without errors")
    else:
        all_passed = False

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    if all_passed:
        print(" ✅ ALL 5 TESTS PASSED")
    else:
        print(" ❌ SOME TESTS FAILED — check output above")
    print("=" * 60)

    return all_passed


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)