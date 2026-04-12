from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.dependencies import get_ledger
from app.core.event_ledger import EventLedger
from app.services.overseer_config_service import OverseerConfigService

router = APIRouter(prefix="/auth", tags=["auth"])


class VerifyPinRequest(BaseModel):
    pin: str


@router.post("/verify-pin")
async def verify_pin(
    request: VerifyPinRequest,
    ledger: EventLedger = Depends(get_ledger),
):
    """Verify a PIN and return the matching employee if valid.

    Used by close-day and other manager-gated operations that require
    PIN re-entry before authorizing a destructive action.
    """
    service = OverseerConfigService(ledger)
    employees = await service.get_employees()

    for e in employees:
        if e.active and e.pin == request.pin:
            return {
                "valid": True,
                "employee_id": e.employee_id,
                "name": e.display_name,
                "roles": e.role_ids,
            }

    return {"valid": False}
