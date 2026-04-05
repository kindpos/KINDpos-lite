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

    print(f"Demo seed complete — {len(seed_data.get('employees', []))} employees loaded")
