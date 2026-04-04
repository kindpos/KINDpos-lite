from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import aiosqlite
import os

# Correcting relative imports for app.api.routes
from ..dependencies import get_ledger
from ...core.event_ledger import EventLedger
from ...core.adapters.payment_manager import PaymentManager
from ...core.adapters.payment_validator import PaymentValidator
from ...core.adapters.base_payment import TransactionRequest, TransactionResult, ValidationStatus, ValidationResult, PaymentDeviceConfig, PaymentDeviceType
from ...core.adapters.mock_payment import MockPaymentDevice
from ...core.adapters.dejavoo_spin import DejavooSPInAdapter
from ...core.events import (
    payment_initiated, payment_confirmed, order_closed, tip_adjusted,
    create_event, EventType,
)
from ...core.projections import project_order
from ...config import settings

router = APIRouter(prefix="/payments", tags=["payments"])

_manager: Optional[PaymentManager] = None
_validator: Optional[PaymentValidator] = None

_devices_initialized = False

HARDWARE_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'hardware_config.db')


async def _ensure_devices(manager: PaymentManager):
    """Load saved card readers as SPIn adapters, fall back to mock."""
    global _devices_initialized
    if _devices_initialized:
        return
    _devices_initialized = True

    # Try to load a real card reader from hardware_config.db
    reader_found = False
    if os.path.exists(HARDWARE_DB_PATH):
        try:
            async with aiosqlite.connect(HARDWARE_DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                async with db.execute("SELECT * FROM devices WHERE type = 'card_reader' LIMIT 1") as cur:
                    row = await cur.fetchone()
                    if row:
                        device = dict(row)
                        adapter = DejavooSPInAdapter()
                        config = PaymentDeviceConfig(
                            device_id=device['mac'],
                            name=device.get('name', 'Dejavoo'),
                            device_type=PaymentDeviceType.SMART_TERMINAL,
                            ip_address=device['ip'],
                            mac_address=device['mac'],
                            port=device.get('port', 9000),
                            protocol="spin",
                            processor_id="dejavoo",
                            register_id=device.get('register_id', ''),
                            auth_key=device.get('auth_key', ''),
                        )
                        connected = await adapter.connect(config)
                        if connected:
                            manager.register_device(adapter)
                            manager.map_terminal_to_device(settings.terminal_id, device['mac'])
                            manager.map_terminal_to_device("T-001", device['mac'])
                            reader_found = True
                            print(f"  Card reader loaded: {device.get('name', device['mac'])} @ {device['ip']}:{device.get('port', 8443)}")
                        else:
                            print(f"  Card reader saved but unreachable: {device['ip']}:{device.get('port', 8443)}")
        except Exception as e:
            print(f"  Warning: could not load card reader: {e}")

    # Fall back to mock if no real device found
    if not reader_found:
        mock = MockPaymentDevice()
        config = PaymentDeviceConfig(
            device_id="mock_001",
            name="Mock Payment Device",
            device_type=PaymentDeviceType.SMART_TERMINAL,
            ip_address="127.0.0.1",
            mac_address="00:00:00:00:00:00",
            port=8443,
            protocol="mock",
            processor_id="mock_processor",
        )
        await mock.connect(config)
        manager.register_device(mock)
        manager.map_terminal_to_device(settings.terminal_id, "mock_001")
        manager.map_terminal_to_device("T-001", "mock_001")
        print("  Mock payment device registered (no card reader found)")


@router.post("/reload-devices")
async def reload_devices(ledger: EventLedger = Depends(get_ledger)):
    """Hot-reload card reader from hardware_config.db without server restart."""
    global _devices_initialized, _manager
    _devices_initialized = False
    _manager = PaymentManager(ledger, settings.terminal_id)
    await _ensure_devices(_manager)
    # Report what's active
    device_ids = list(_manager._devices.keys()) if hasattr(_manager, '_devices') else []
    return {
        "reloaded": True,
        "active_devices": device_ids,
        "using_mock": any("mock" in d for d in device_ids),
    }

def get_payment_manager(ledger: EventLedger = Depends(get_ledger)) -> PaymentManager:
    global _manager
    if _manager is None:
        _manager = PaymentManager(ledger, settings.terminal_id)
    return _manager

def get_payment_validator(ledger: EventLedger = Depends(get_ledger)) -> PaymentValidator:
    global _validator
    if _validator is None:
        _validator = PaymentValidator(ledger)
    return _validator

@router.post("/sale")
async def process_sale(
    request: TransactionRequest,
    manager: PaymentManager = Depends(get_payment_manager),
    validator: PaymentValidator = Depends(get_payment_validator)
):
    """Initiate sale. Returns ValidationResult or TransactionResult."""
    await _ensure_devices(manager)
    # 1. Resolve Device
    device_id = manager._terminal_device_map.get(request.terminal_id)
    device = manager._devices.get(device_id) if device_id else None

    # 2. Validate
    v_result = await validator.validate(request, device)
    if v_result.status == ValidationStatus.REJECTED:
        raise HTTPException(status_code=400, detail=v_result.reason)

    if v_result.status == ValidationStatus.NEEDS_APPROVAL:
        return v_result # Return to frontend for PIN entry

    # 3. Process
    result = await manager.initiate_sale(request)
    return result


# =============================================================================
# CASH PAYMENT
# =============================================================================

class CashPaymentRequest(BaseModel):
    order_id: str
    amount: float
    tip: float = 0.0
    payment_method: str = "cash"


@router.post("/cash")
async def process_cash_payment(
    request: CashPaymentRequest,
    ledger: EventLedger = Depends(get_ledger),
):
    """Process a cash payment — immediately confirmed, closes order if fully paid."""
    # Get current order state
    events = await ledger.get_events_by_correlation(request.order_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"Order {request.order_id} not found")
    order = project_order(events)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {request.order_id} not found")

    if order.status in ("closed", "voided"):
        raise HTTPException(status_code=400, detail=f"Cannot pay on {order.status} order")

    # Apply cash dual-pricing discount if paying less than order total
    cash_discount = round(order.total - request.amount, 2)
    if cash_discount > 0 and request.payment_method == "cash":
        discount_evt = create_event(
            event_type=EventType.DISCOUNT_APPROVED,
            terminal_id=settings.terminal_id,
            payload={
                "order_id": request.order_id,
                "discount_type": "cash_dual_pricing",
                "amount": cash_discount,
                "reason": "Cash dual-pricing discount",
            },
            correlation_id=request.order_id,
        )
        await ledger.append(discount_evt)
        # Re-project so order.total reflects the discount
        events = await ledger.get_events_by_correlation(request.order_id)
        order = project_order(events)

    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    total_with_tip = round(request.amount + request.tip, 2)

    # Emit PAYMENT_INITIATED
    init_evt = payment_initiated(
        terminal_id=settings.terminal_id,
        order_id=request.order_id,
        payment_id=payment_id,
        amount=total_with_tip,
        method="cash",
    )
    await ledger.append(init_evt)

    # Cash is immediately confirmed
    confirm_evt = payment_confirmed(
        terminal_id=settings.terminal_id,
        order_id=request.order_id,
        payment_id=payment_id,
        transaction_id=f"cash_{uuid.uuid4().hex[:8]}",
        amount=total_with_tip,
    )
    await ledger.append(confirm_evt)

    # Record tip if any
    if request.tip > 0:
        tip_evt = tip_adjusted(
            terminal_id=settings.terminal_id,
            order_id=request.order_id,
            payment_id=payment_id,
            tip_amount=round(request.tip, 2),
        )
        await ledger.append(tip_evt)

    # Re-project to check if fully paid
    events = await ledger.get_events_by_correlation(request.order_id)
    order = project_order(events)

    # Auto-close if fully paid
    if order and order.is_fully_paid and order.status != "closed":
        close_evt = order_closed(
            terminal_id=settings.terminal_id,
            order_id=request.order_id,
            total=order.total,
        )
        await ledger.append(close_evt)

    return {
        "success": True,
        "payment_id": payment_id,
        "order_id": request.order_id,
        "amount": total_with_tip,
        "tip": request.tip,
    }


# =============================================================================
# TIP ADJUSTMENT (post-payment)
# =============================================================================

class TipAdjustRequest(BaseModel):
    order_id: str
    payment_id: str
    tip_amount: float


@router.post("/tip-adjust")
async def adjust_tip(
    request: TipAdjustRequest,
    ledger: EventLedger = Depends(get_ledger),
):
    """Adjust tip on an existing payment (e.g. from signed credit card receipt)."""
    events = await ledger.get_events_by_correlation(request.order_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"Order {request.order_id} not found")
    order = project_order(events)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {request.order_id} not found")

    # Find the payment
    target = None
    for p in order.payments:
        if p.payment_id == request.payment_id:
            target = p
            break
    if not target:
        raise HTTPException(status_code=404, detail=f"Payment {request.payment_id} not found")
    if target.status != "confirmed":
        raise HTTPException(status_code=400, detail="Can only adjust tips on confirmed payments")

    # Get previous tip from existing TIP_ADJUSTED events
    previous_tip = 0.0
    for e in events:
        if (e.event_type == EventType.TIP_ADJUSTED
                and e.payload.get("payment_id") == request.payment_id):
            previous_tip = e.payload.get("tip_amount", 0.0)

    tip_amt = round(request.tip_amount, 2)
    evt = tip_adjusted(
        terminal_id=settings.terminal_id,
        order_id=request.order_id,
        payment_id=request.payment_id,
        tip_amount=tip_amt,
        previous_tip=previous_tip,
    )
    await ledger.append(evt)

    # Send tip adjust to payment device so it's included in batch settlement
    device_adjusted = False
    device_error = None
    manager = get_payment_manager(ledger)
    await _ensure_devices(manager)
    device = manager.get_device_for_terminal(settings.terminal_id)
    if device and hasattr(device, 'adjust_tip') and device.config and device.config.protocol != "mock":
        try:
            from decimal import Decimal
            result = await device.adjust_tip(target.payment_id, Decimal(str(tip_amt)))
            device_adjusted = result.status.value == "APPROVED"
            if not device_adjusted:
                device_error = f"Device tip adjust returned {result.status.value}"
        except Exception as e:
            device_error = f"Device tip adjust exception: {e}"
    if device_error:
        import logging
        logging.getLogger("kindpos.payment").warning(
            f"Tip adjust for {request.payment_id} saved to ledger but device sync failed: {device_error}"
        )

    return {
        "success": True,
        "order_id": request.order_id,
        "payment_id": request.payment_id,
        "tip_amount": tip_amt,
        "previous_tip": previous_tip,
        "device_adjusted": device_adjusted,
        "device_warning": device_error,
    }


@router.get("/device-status")
async def get_device_status(manager: PaymentManager = Depends(get_payment_manager)):
    """All devices: id, name, status, last_checked."""
    return [
        {
            "id": d.config.device_id if d.config else "unknown",
            "name": d.config.name if d.config else "Unknown",
            "status": d.status,
            "ip": d.config.ip_address if d.config else None
        }
        for d in manager._devices.values()
    ]
