"""
Seed script — appends menu categories, items, and modifier groups for the demo
food truck menu.

Usage (from backend/ directory):
    python seed_demo_data.py

Idempotent: checks for existing MENU_ITEM_CREATED events before seeding.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.event_ledger import EventLedger
from app.core.events import create_event, EventType

# ── Categories ────────────────────────────────────────────────────────────────

CATEGORIES = [
    {"category_id": "combo",      "name": "Combo",      "label": "COMBO",      "color": "#d4a017", "display_order": 1},
    {"category_id": "ribs",       "name": "Ribs",       "label": "RIBS",       "color": "#c0392b", "display_order": 2},
    {"category_id": "sandwiches", "name": "Sandwiches", "label": "SANDWICHES", "color": "#7ac943", "display_order": 3},
    {"category_id": "sides",      "name": "Sides",      "label": "SIDES",      "color": "#00bcd4", "display_order": 4},
    {"category_id": "soda",       "name": "Soda",       "label": "SODA",       "color": "#2196f3", "display_order": 5},
]

# ── Menu Items ────────────────────────────────────────────────────────────────

MENU_ITEMS = [
    # Combo
    {"item_id": "combo_half_rack",   "name": "Combo Half Rack",    "price": 16.00, "category": "Combo",      "display_order": 1},
    {"item_id": "combo_pulled_pork", "name": "Combo Pulled Pork",  "price": 14.00, "category": "Combo",      "display_order": 2},
    # Ribs
    {"item_id": "full_rack",         "name": "Full Rack",          "price": 18.00, "category": "Ribs",       "display_order": 1},
    {"item_id": "half_rack",         "name": "Half Rack",          "price": 12.00, "category": "Ribs",       "display_order": 2},
    # Sandwiches
    {"item_id": "pulled_pork",       "name": "Pulled Pork",        "price": 10.00, "category": "Sandwiches", "display_order": 1},
    {"item_id": "sliced_brisket",    "name": "Sliced Brisket",     "price": 12.00, "category": "Sandwiches", "display_order": 2},
    # Sides
    {"item_id": "fries",             "name": "Fries",              "price":  4.00, "category": "Sides",      "display_order": 1},
    {"item_id": "baked_potato",      "name": "Baked Potato",       "price":  5.00, "category": "Sides",      "display_order": 2},
    {"item_id": "slaw",              "name": "Slaw",               "price":  3.00, "category": "Sides",      "display_order": 3},
    # Soda
    {"item_id": "coke",              "name": "Coke",               "price":  3.00, "category": "Soda",       "display_order": 1},
    {"item_id": "sprite",            "name": "Sprite",             "price":  3.00, "category": "Soda",       "display_order": 2},
    {"item_id": "diet_coke",         "name": "Diet Coke",          "price":  3.00, "category": "Soda",       "display_order": 3},
    {"item_id": "fanta",             "name": "Fanta",              "price":  3.00, "category": "Soda",       "display_order": 4},
]

# ── Modifier Groups ──────────────────────────────────────────────────────────

MODIFIER_GROUPS = [
    {
        "group_id": "sauce",
        "name": "Sauce",
        "modifiers": [
            {"modifier_id": "sweet",   "name": "Sweet",   "price": 0.00},
            {"modifier_id": "hot",     "name": "Hot",     "price": 0.00},
            {"modifier_id": "mild",    "name": "Mild",    "price": 0.00},
            {"modifier_id": "vinegar", "name": "Vinegar", "price": 0.00},
            {"modifier_id": "mustard", "name": "Mustard", "price": 0.00},
        ],
    },
    {
        "group_id": "extras",
        "name": "Extras",
        "modifiers": [
            {"modifier_id": "extra_meat", "name": "Extra Meat",  "price": 3.00},
            {"modifier_id": "cheese",     "name": "Cheese",      "price": 1.00},
            {"modifier_id": "jalapenos",  "name": "Jalape\u00f1os",    "price": 0.50},
            {"modifier_id": "onions",     "name": "Onions",      "price": 0.00},
        ],
    },
]


async def main():
    ledger = EventLedger("data/event_ledger.db")
    await ledger.connect()

    # ── Check existing data for idempotency ───────────────────────────────
    existing_items = await ledger.get_events_by_type(EventType.MENU_ITEM_CREATED, limit=1000)
    existing_item_ids = {e.payload.get("item_id") for e in existing_items}

    existing_cats = await ledger.get_events_by_type(EventType.MENU_CATEGORY_CREATED, limit=1000)
    existing_cat_ids = {e.payload.get("category_id") for e in existing_cats}

    existing_mods = await ledger.get_events_by_type(EventType.MODIFIER_GROUP_CREATED, limit=1000)
    existing_mod_ids = {e.payload.get("group_id") for e in existing_mods}

    seeded = 0

    # ── Seed categories ───────────────────────────────────────────────────
    for cat in CATEGORIES:
        if cat["category_id"] in existing_cat_ids:
            print(f"  skip  category: {cat['name']} (already in ledger)")
            continue
        event = create_event(
            event_type=EventType.MENU_CATEGORY_CREATED,
            terminal_id="SEED",
            payload=cat,
        )
        await ledger.append(event)
        print(f"  added category: {cat['name']}")
        seeded += 1

    # ── Seed menu items ───────────────────────────────────────────────────
    for item in MENU_ITEMS:
        if item["item_id"] in existing_item_ids:
            print(f"  skip  item: {item['name']} (already in ledger)")
            continue
        event = create_event(
            event_type=EventType.MENU_ITEM_CREATED,
            terminal_id="SEED",
            payload=item,
        )
        await ledger.append(event)
        print(f"  added item: {item['name']}  ${item['price']:.2f}")
        seeded += 1

    # ── Seed modifier groups ──────────────────────────────────────────────
    for group in MODIFIER_GROUPS:
        if group["group_id"] in existing_mod_ids:
            print(f"  skip  modifier group: {group['name']} (already in ledger)")
            continue
        event = create_event(
            event_type=EventType.MODIFIER_GROUP_CREATED,
            terminal_id="SEED",
            payload=group,
        )
        await ledger.append(event)
        mods_str = ", ".join(m["name"] for m in group["modifiers"])
        print(f"  added modifier group: {group['name']}  [{mods_str}]")
        seeded += 1

    await ledger.close()
    print(f"\nDone — {seeded} event(s) seeded ({len(MENU_ITEMS)} items, {len(CATEGORIES)} categories, {len(MODIFIER_GROUPS)} modifier groups).")


if __name__ == "__main__":
    asyncio.run(main())
