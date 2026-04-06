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
    {"category_id": "mains",  "name": "Mains",  "label": "MAINS",  "color": "#7ac943", "display_order": 1},
    {"category_id": "sides",  "name": "Sides",  "label": "SIDES",  "color": "#00bcd4", "display_order": 2},
    {"category_id": "drinks", "name": "Drinks", "label": "DRINKS", "color": "#ff9800", "display_order": 3},
    {"category_id": "combos", "name": "Combos", "label": "COMBOS", "color": "#b48efa", "display_order": 4},
]

# ── Menu Items ────────────────────────────────────────────────────────────────

MENU_ITEMS = [
    # Mains
    {"item_id": "smash_burger",      "name": "Smash Burger",       "price": 10.00, "category": "Mains",  "display_order": 1},
    {"item_id": "bbq_pulled_pork",   "name": "BBQ Pulled Pork",    "price": 12.00, "category": "Mains",  "display_order": 2},
    {"item_id": "fish_tacos",        "name": "Fish Tacos",         "price": 11.00, "category": "Mains",  "display_order": 3},
    {"item_id": "chicken_wrap",      "name": "Chicken Wrap",       "price": 10.00, "category": "Mains",  "display_order": 4},
    {"item_id": "loaded_hot_dog",    "name": "Loaded Dog",         "price":  8.00, "category": "Mains",  "display_order": 5},
    {"item_id": "veggie_burger",     "name": "Veggie Burger",      "price": 11.00, "category": "Mains",  "display_order": 6},
    # Sides
    {"item_id": "fries",             "name": "Fries",              "price":  4.00, "category": "Sides",  "display_order": 1},
    {"item_id": "onion_rings",       "name": "Onion Rings",        "price":  5.00, "category": "Sides",  "display_order": 2},
    {"item_id": "mac_cheese",        "name": "Mac & Cheese",       "price":  6.00, "category": "Sides",  "display_order": 3},
    {"item_id": "street_corn",       "name": "Street Corn",        "price":  5.00, "category": "Sides",  "display_order": 4},
    # Drinks
    {"item_id": "lemonade",          "name": "Lemonade",           "price":  4.00, "category": "Drinks", "display_order": 1},
    {"item_id": "iced_tea",          "name": "Iced Tea",           "price":  3.00, "category": "Drinks", "display_order": 2},
    {"item_id": "craft_soda",        "name": "Craft Soda",         "price":  4.00, "category": "Drinks", "display_order": 3},
    {"item_id": "water",             "name": "Water",              "price":  2.00, "category": "Drinks", "display_order": 4},
    # Combos
    {"item_id": "burger_combo",      "name": "Burger Combo",       "price": 14.00, "category": "Combos", "display_order": 1},
    {"item_id": "taco_combo",        "name": "Taco Combo",         "price": 15.00, "category": "Combos", "display_order": 2},
    {"item_id": "kids_combo",        "name": "Kid's Combo",        "price":  8.00, "category": "Combos", "display_order": 3},
]

# ── Modifier Groups ──────────────────────────────────────────────────────────

MODIFIER_GROUPS = [
    {
        "group_id": "proteins",
        "name": "Proteins",
        "modifiers": [
            {"modifier_id": "add_chicken", "name": "Add Chicken", "price": 3.00},
            {"modifier_id": "add_shrimp",  "name": "Add Shrimp",  "price": 4.00},
            {"modifier_id": "add_bacon",   "name": "Add Bacon",   "price": 2.00},
        ],
    },
    {
        "group_id": "sizes",
        "name": "Sizes",
        "modifiers": [
            {"modifier_id": "size_small",   "name": "Small",   "price": 0.00},
            {"modifier_id": "size_regular", "name": "Regular", "price": 0.00},
            {"modifier_id": "size_large",   "name": "Large",   "price": 2.00},
        ],
    },
    {
        "group_id": "add_ons",
        "name": "Add-Ons",
        "modifiers": [
            {"modifier_id": "extra_cheese", "name": "Extra Cheese", "price": 1.00},
            {"modifier_id": "avocado",      "name": "Avocado",      "price": 2.00},
            {"modifier_id": "jalapenos",    "name": "Jalape\u00f1os",     "price": 0.50},
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
