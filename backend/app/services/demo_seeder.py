"""
Demo seeder — auto-seeds employees and restaurant config on first boot.

If the event ledger has zero EMPLOYEE_CREATED events (fresh database),
loads demo_seed.json and emits the appropriate events so the terminal
is immediately usable without running a manual seed script.
"""

import json
import os

from app.core.event_ledger import EventLedger
from app.core.events import create_event, EventType


_SEED_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'data', 'demo_seed.json'
)


async def seed_demo_data_if_empty(ledger: EventLedger) -> None:
    existing = await ledger.get_events_by_type(EventType.EMPLOYEE_CREATED, limit=1)
    if existing:
        # Employees exist — but check if menu needs seeding
        await seed_menu_if_empty(ledger)
        return

    seed_path = os.path.normpath(_SEED_PATH)
    if not os.path.exists(seed_path):
        print(f"Demo seed file not found at {seed_path} — skipping auto-seed")
        return

    with open(seed_path, 'r') as f:
        seed_data = json.load(f)

    # Seed employees
    for emp in seed_data.get("employees", []):
        name = emp["name"]
        parts = name.split(" ", 1)
        payload = {
            "employee_id": emp["employee_id"],
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else "",
            "display_name": name,
            "role_ids": [emp["role"]],
            "pin": emp["pin"],
            "hourly_rate": 0.0,
            "active": True,
        }
        event = create_event(
            event_type=EventType.EMPLOYEE_CREATED,
            terminal_id="SEED",
            payload=payload,
        )
        await ledger.append(event)
        print(f"  seeded {name} [{emp['role']}] PIN:{emp['pin']}")

    # Seed restaurant config
    restaurant = seed_data.get("restaurant")
    if restaurant:
        event = create_event(
            event_type=EventType.STORE_INFO_UPDATED,
            terminal_id="SEED",
            payload=restaurant,
        )
        await ledger.append(event)
        print(f"  seeded restaurant config: {restaurant.get('name', '?')}")

    # Seed menu categories
    for cat in seed_data.get("categories", []):
        event = create_event(
            event_type=EventType.MENU_CATEGORY_CREATED,
            terminal_id="SEED",
            payload=cat,
        )
        await ledger.append(event)
        print(f"  seeded category: {cat['name']}")

    # Seed menu items
    for item in seed_data.get("items", []):
        event = create_event(
            event_type=EventType.MENU_ITEM_CREATED,
            terminal_id="SEED",
            payload=item,
        )
        await ledger.append(event)
    print(f"  seeded {len(seed_data.get('items', []))} menu items")

    # Seed modifier groups
    for group in seed_data.get("modifier_groups", []):
        event = create_event(
            event_type=EventType.MODIFIER_GROUP_CREATED,
            terminal_id="SEED",
            payload=group,
        )
        await ledger.append(event)
    mod_count = len(seed_data.get("modifier_groups", []))
    if mod_count:
        print(f"  seeded {mod_count} modifier groups")

    print(f"Demo seed complete — {len(seed_data.get('employees', []))} employees loaded")


async def seed_menu_if_empty(ledger: EventLedger) -> None:
    """Seed menu categories and items if none exist."""
    existing_cats = await ledger.get_events_by_type(EventType.MENU_CATEGORY_CREATED, limit=1)
    if existing_cats:
        return

    seed_path = os.path.normpath(_SEED_PATH)
    if not os.path.exists(seed_path):
        return

    with open(seed_path, 'r') as f:
        seed_data = json.load(f)

    categories = seed_data.get("categories", [])
    items = seed_data.get("items", [])
    if not categories and not items:
        return

    for cat in categories:
        event = create_event(
            event_type=EventType.MENU_CATEGORY_CREATED,
            terminal_id="SEED",
            payload=cat,
        )
        await ledger.append(event)

    for item in items:
        event = create_event(
            event_type=EventType.MENU_ITEM_CREATED,
            terminal_id="SEED",
            payload=item,
        )
        await ledger.append(event)

    mod_groups = seed_data.get("modifier_groups", [])
    for group in mod_groups:
        event = create_event(
            event_type=EventType.MODIFIER_GROUP_CREATED,
            terminal_id="SEED",
            payload=group,
        )
        await ledger.append(event)

    print(f"Menu seed complete — {len(categories)} categories, {len(items)} items, {len(mod_groups)} modifier groups")
