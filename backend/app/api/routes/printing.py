import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from pathlib import Path

from ..dependencies import get_ledger
from ...core.event_ledger import EventLedger
from ...printing.print_queue import PrintJobQueue
from ...services.print_context_builder import PrintContextBuilder

router = APIRouter(prefix="/print", tags=["printing"])

# In a real app, these would be managed by dependency injection
# For this task, we initialize them here or in main.py
print_queue = PrintJobQueue()
# Note: In production, PrintContextBuilder would be injected with the ledger

@router.on_event("startup")
async def startup():
    await print_queue.connect()

@router.on_event("shutdown")
async def shutdown():
    await print_queue.close()

@router.post("/receipt/{order_id}")
async def print_receipt(
    order_id: str,
    copy_type: str = "customer",   # query param: customer | merchant | itemized
    ledger: EventLedger = Depends(get_ledger),
):
    """Trigger receipt print for completed order. copy_type defaults to customer."""
    builder = PrintContextBuilder(ledger)
    context = await builder.build_receipt_context(order_id, copy_type=copy_type)
    job_id  = await print_queue.enqueue(
        order_id=order_id,
        template_id="guest_receipt",
        printer_mac="DEFAULT_RECEIPT",
        ticket_number=context.get("ticket_number", "N/A"),
        context=context,
        copy_type=copy_type,
    )
    return {"status": "queued", "job_id": job_id, "copy_type": copy_type}

@router.post("/ticket/{order_id}")
async def print_ticket(order_id: str, ledger: EventLedger = Depends(get_ledger)):
    """Trigger kitchen ticket for order."""
    builder = PrintContextBuilder(ledger)
    context = await builder.build_kitchen_context(order_id, station_name="General")
    job_id = await print_queue.enqueue(
        order_id=order_id,
        template_id="kitchen_ticket",
        printer_mac="DEFAULT_KITCHEN",
        ticket_number=context.get('ticket_number', 'N/A'),
        context=context
    )
    return {"status": "queued", "job_id": job_id}

@router.get("/queue")
async def get_queue():
    """Return all queued and failed print jobs."""
    pending = await print_queue.get_pending_jobs()
    failed = await print_queue.get_failed_jobs()
    return {"pending": pending, "failed": failed}

@router.post("/queue/{job_id}/retry")
async def retry_job(job_id: str):
    """Manually retry a failed job."""
    await print_queue.reset_for_retry(job_id)
    return {"status": "reset_for_retry", "job_id": job_id}

class ClockHoursRequest(BaseModel):
    employee_name: str
    role_name: str = ""
    action: str = "CLOCK IN"


@router.post("/clock-hours/{employee_id}")
async def print_clock_hours(
    employee_id: str,
    request: ClockHoursRequest,
    ledger: EventLedger = Depends(get_ledger),
):
    """Print shift hours and pay-period summary on clock in/out."""
    builder = PrintContextBuilder(ledger)
    context = await builder.build_clock_hours_context(
        employee_id=employee_id,
        employee_name=request.employee_name,
        role_name=request.role_name,
        action=request.action,
    )
    job_id = await print_queue.enqueue(
        order_id=f"clock-{employee_id}",
        template_id="clock_hours",
        printer_mac="DEFAULT_RECEIPT",
        ticket_number="CLK",
        context=context,
    )
    return {"status": "queued", "job_id": job_id}


class SalesRecapRequest(BaseModel):
    printed_by: str = "Manager"


@router.post("/sales-recap")
async def print_sales_recap(
    request: SalesRecapRequest,
    ledger: EventLedger = Depends(get_ledger),
):
    """Print end-of-day sales recap report."""
    builder = PrintContextBuilder(ledger)
    context = await builder.build_sales_recap_context(printed_by=request.printed_by)
    job_id = await print_queue.enqueue(
        order_id="sales-recap",
        template_id="sales_recap",
        printer_mac="DEFAULT_RECEIPT",
        ticket_number="RPT",
        context=context,
    )
    return {"status": "queued", "job_id": job_id}


class ServerCheckoutPrintRequest(BaseModel):
    server_name: str = ""
    declared_cash_tips: Optional[float] = None


@router.post("/server-checkout/{server_id}")
async def print_server_checkout(
    server_id: str,
    request: ServerCheckoutPrintRequest,
    ledger: EventLedger = Depends(get_ledger),
):
    """Print server checkout report."""
    builder = PrintContextBuilder(ledger)
    context = await builder.build_server_checkout_context(
        server_id=server_id,
        server_name=request.server_name,
        declared_cash_tips=request.declared_cash_tips,
    )
    job_id = await print_queue.enqueue(
        order_id=f"checkout-{server_id}",
        template_id="server_checkout",
        printer_mac="DEFAULT_RECEIPT",
        ticket_number="CHK",
        context=context,
    )
    return {"status": "queued", "job_id": job_id}


@router.post("/test")
async def print_test(template_name: str = Body(..., embed=True), printer_mac: str = Body(..., embed=True)):
    """Fire a fixture template to a printer (test panel)."""
    fixture_path = Path(f"core/backend/app/printing/fixtures/{template_name}.json")
    if not fixture_path.exists():
        raise HTTPException(status_code=404, detail=f"Fixture {template_name} not found")
    
    with open(fixture_path, 'r') as f:
        context = json.load(f)
    
    job_id = await print_queue.enqueue(
        order_id=context.get('order_id', 'TEST'),
        template_id=template_name,
        printer_mac=printer_mac,
        ticket_number=context.get('ticket_number', 'TEST'),
        context=context
    )
    return {"status": "test_job_queued", "job_id": job_id}
