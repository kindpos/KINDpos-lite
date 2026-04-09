"""
Seed script — appends EMPLOYEE_CREATED events for the default staff roster.

Usage (from backend/ directory):
    python seed_employees.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.event_ledger import EventLedger
from app.core.events import create_event, EventType

STAFF = [
    {"employee_id": "rose",     "first_name": "Rose",     "last_name": "Nylund",    "display_name": "Rose Nylund",      "role_ids": ["manager", "server"],  "pin": "1234", "hourly_rate": 18.00},
    {"employee_id": "blanche",  "first_name": "Blanche",  "last_name": "Devereaux", "display_name": "Blanche Devereaux","role_ids": ["server", "host"],     "pin": "5678", "hourly_rate": 14.00},
    {"employee_id": "dorothy",  "first_name": "Dorothy",  "last_name": "Zbornak",   "display_name": "Dorothy Zbornak",  "role_ids": ["server"],             "pin": "1111", "hourly_rate": 14.00},
    {"employee_id": "sophia",   "first_name": "Sophia",   "last_name": "Petrillo",  "display_name": "Sophia Petrillo",  "role_ids": ["cook", "server"],     "pin": "2222", "hourly_rate": 16.00},
    {"employee_id": "stan",     "first_name": "Stan",     "last_name": "Zbornak",   "display_name": "Stan Zbornak",     "role_ids": ["cook", "busser"],     "pin": "3456", "hourly_rate": 12.00},
]

async def main():
    ledger = EventLedger("data/event_ledger.db")
    await ledger.connect()

    # Check for existing employees so re-running is safe
    existing = await ledger.get_events_by_type(EventType.EMPLOYEE_CREATED, limit=1000)
    existing_ids = {e.payload.get("employee_id") for e in existing}

    seeded = 0
    for emp in STAFF:
        if emp["employee_id"] in existing_ids:
            print(f"  skip  {emp['display_name']} (already in ledger)")
            continue
        event = create_event(
            event_type=EventType.EMPLOYEE_CREATED,
            terminal_id="SEED",
            payload={**emp, "active": True},
        )
        await ledger.append(event)
        print(f"  added {emp['display_name']}  {emp['role_ids']}  PIN: {emp['pin']}")
        seeded += 1

    await ledger.close()
    print(f"\nDone — {seeded} employee(s) seeded.")

if __name__ == "__main__":
    asyncio.run(main())
