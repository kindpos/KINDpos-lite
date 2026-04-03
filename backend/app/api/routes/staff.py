from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.api.dependencies import get_ledger
from app.core.event_ledger import EventLedger
from app.core.events import user_logged_in, user_logged_out, EventType
from app.config import settings
from app.services.overseer_config_service import OverseerConfigService

router = APIRouter(prefix="/servers", tags=["staff"])


@router.get("")
async def get_servers(ledger: EventLedger = Depends(get_ledger)):
    """
    Returns active employees shaped for the terminal login roster.
    Called by the terminal UI on mount to populate the PIN login screen.
    """
    service = OverseerConfigService(ledger)
    employees = await service.get_employees()
    return {
        "servers": [
            {
                "id": e.employee_id,
                "name": e.display_name,
                "pin": e.pin,
                "role": e.role_id,
            }
            for e in employees
            if e.active
        ]
    }


# =============================================================================
# CLOCK IN / OUT
# =============================================================================

class ClockInRequest(BaseModel):
    employee_id: str
    employee_name: str
    pin: Optional[str] = None


class ClockOutRequest(BaseModel):
    employee_id: str
    employee_name: str


@router.post("/clock-in")
async def clock_in(request: ClockInRequest, ledger: EventLedger = Depends(get_ledger)):
    """Record a staff clock-in event."""
    event = user_logged_in(
        terminal_id=settings.terminal_id,
        employee_id=request.employee_id,
        employee_name=request.employee_name,
    )
    await ledger.append(event)
    return {
        "success": True,
        "employee_id": request.employee_id,
        "employee_name": request.employee_name,
        "clocked_in_at": event.timestamp.isoformat(),
    }


@router.post("/clock-out")
async def clock_out(request: ClockOutRequest, ledger: EventLedger = Depends(get_ledger)):
    """Record a staff clock-out event."""
    event = user_logged_out(
        terminal_id=settings.terminal_id,
        employee_id=request.employee_id,
        employee_name=request.employee_name,
    )
    await ledger.append(event)
    return {
        "success": True,
        "employee_id": request.employee_id,
        "employee_name": request.employee_name,
        "clocked_out_at": event.timestamp.isoformat(),
    }


@router.get("/clocked-in")
async def get_clocked_in(ledger: EventLedger = Depends(get_ledger)):
    """Get all currently clocked-in staff by replaying login/logout events."""
    login_events = await ledger.get_events_by_type(EventType.USER_LOGGED_IN)
    logout_events = await ledger.get_events_by_type(EventType.USER_LOGGED_OUT)

    # Track latest clock-in per employee
    clocked_in = {}
    for e in sorted(login_events, key=lambda x: x.sequence_number or 0):
        eid = e.payload["employee_id"]
        clocked_in[eid] = {
            "employee_id": eid,
            "employee_name": e.payload["employee_name"],
            "clocked_in_at": e.timestamp.isoformat(),
        }

    # Remove anyone who clocked out after their last clock-in
    for e in sorted(logout_events, key=lambda x: x.sequence_number or 0):
        eid = e.payload["employee_id"]
        if eid in clocked_in:
            del clocked_in[eid]

    return {"staff": list(clocked_in.values())}
