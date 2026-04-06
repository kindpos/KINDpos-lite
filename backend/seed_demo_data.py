"""
Seed script — appends menu categories, items, and modifier groups for the demo
pizza shop menu.

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
    {"category_id": "pizza",  "name": "Pizza",       "label": "PIZZA",  "color": "#c0392b", "display_order": 1},
    {"category_id": "apps",   "name": "Appetizers",  "label": "APPS",   "color": "#d4a017", "display_order": 2},
    {"category_id": "subs",   "name": "Subs",        "label": "SUBS",   "color": "#7ac943", "display_order": 3},
    {"category_id": "sides",  "name": "Sides",       "label": "SIDES",  "color": "#00bcd4", "display_order": 4},
    {"category_id": "drinks", "name": "Drinks",      "label": "DRINKS", "color": "#2196f3", "display_order": 5},
]

# ── Menu Items ────────────────────────────────────────────────────────────────

MENU_ITEMS = [
    # Pizza
    {"item_id": "lg_cheese",    "name": "Large Cheese",    "price": 14.00, "category": "Pizza",       "display_order": 1},
    {"item_id": "lg_pepperoni", "name": "Large Pepperoni", "price": 16.00, "category": "Pizza",       "display_order": 2},
    {"item_id": "lg_supreme",   "name": "Large Supreme",   "price": 18.00, "category": "Pizza",       "display_order": 3},
    {"item_id": "sl_cheese",    "name": "Slice Cheese",    "price":  3.50, "category": "Pizza",       "display_order": 4},
    {"item_id": "sl_pepperoni", "name": "Slice Pepperoni", "price":  4.00, "category": "Pizza",       "display_order": 5},
    {"item_id": "calzone",      "name": "Calzone",         "price": 12.00, "category": "Pizza",       "display_order": 6},
    # Appetizers
    {"item_id": "garlic_knots", "name": "Garlic Knots",    "price":  6.00, "category": "Appetizers",  "display_order": 1},
    {"item_id": "mozz_sticks",  "name": "Mozz Sticks",     "price":  8.00, "category": "Appetizers",  "display_order": 2},
    {"item_id": "buffalo_wings","name": "Buffalo Wings",    "price": 10.00, "category": "Appetizers",  "display_order": 3},
    {"item_id": "garlic_bread", "name": "Garlic Bread",    "price":  5.00, "category": "Appetizers",  "display_order": 4},
    # Subs
    {"item_id": "italian_sub",  "name": "Italian Sub",     "price": 10.00, "category": "Subs",        "display_order": 1},
    {"item_id": "meatball_sub", "name": "Meatball Sub",    "price":  9.00, "category": "Subs",        "display_order": 2},
    {"item_id": "chx_parm_sub", "name": "Chicken Parm Sub","price": 11.00, "category": "Subs",        "display_order": 3},
    # Sides
    {"item_id": "house_salad",  "name": "House Salad",     "price":  7.00, "category": "Sides",       "display_order": 1},
    {"item_id": "caesar_salad", "name": "Caesar Salad",    "price":  8.00, "category": "Sides",       "display_order": 2},
    {"item_id": "fries",        "name": "Fries",           "price":  4.00, "category": "Sides",       "display_order": 3},
    # Drinks
    {"item_id": "soda",         "name": "Soda",            "price":  2.50, "category": "Drinks",      "display_order": 1},
    {"item_id": "iced_tea",     "name": "Iced Tea",        "price":  2.50, "category": "Drinks",      "display_order": 2},
    {"item_id": "water",        "name": "Water",           "price":  1.50, "category": "Drinks",      "display_order": 3},
]

# ── Modifier Groups ──────────────────────────────────────────────────────────

MODIFIER_GROUPS = [
    {
        "group_id": "toppings",
        "name": "Toppings",
        "modifiers": [
            {"modifier_id": "pepperoni",    "name": "Pepperoni",    "price": 1.50},
            {"modifier_id": "sausage",      "name": "Sausage",      "price": 1.50},
            {"modifier_id": "mushrooms",    "name": "Mushrooms",    "price": 1.00},
            {"modifier_id": "onions",       "name": "Onions",       "price": 1.00},
            {"modifier_id": "peppers",      "name": "Peppers",      "price": 1.00},
            {"modifier_id": "extra_cheese", "name": "Extra Cheese", "price": 2.00},
        ],
    },
    {
        "group_id": "dressing",
        "name": "Dressing",
        "modifiers": [
            {"modifier_id": "ranch",       "name": "Ranch",       "price": 0.00},
            {"modifier_id": "blue_cheese", "name": "Blue Cheese", "price": 0.00},
            {"modifier_id": "italian",     "name": "Italian",     "price": 0.00},
            {"modifier_id": "caesar",      "name": "Caesar",      "price": 0.00},
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
