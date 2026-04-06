"""
FastAPI Dependencies

Shared dependencies for API routes.
The Event Ledger is managed here as a singleton.
"""

from typing import AsyncGenerator
from app.core.event_ledger import EventLedger
from app.core.ephemeral_log import EphemeralLog
from app.core.adapters.printer_manager import PrinterManager
from app.config import settings

# Global ledger instance (initialized on startup)
_ledger: EventLedger | None = None
_ephemeral_log: EphemeralLog | None = None
_printer_manager: PrinterManager | None = None


async def get_ledger() -> EventLedger:
    """Dependency that provides the Event Ledger."""
    if _ledger is None:
        raise RuntimeError("Event Ledger not initialized")
    return _ledger


async def get_ephemeral_log() -> EphemeralLog:
    """Dependency that provides the Ephemeral Log."""
    if _ephemeral_log is None:
        raise RuntimeError("Ephemeral Log not initialized")
    return _ephemeral_log


async def init_ledger() -> EventLedger:
    """Initialize the Event Ledger and Ephemeral Log on startup."""
    global _ledger, _ephemeral_log
    _ledger = EventLedger(settings.database_path)
    await _ledger.connect()
    _ephemeral_log = EphemeralLog(
        settings.database_path.replace("event_ledger.db", "ephemeral_log.db")
    )
    await _ephemeral_log.connect()
    return _ledger


async def close_ledger() -> None:
    """Close the Event Ledger and Ephemeral Log on shutdown."""
    global _ledger, _ephemeral_log
    if _ledger:
        await _ledger.close()
        _ledger = None
    if _ephemeral_log:
        await _ephemeral_log.close()
        _ephemeral_log = None


def get_printer_manager() -> PrinterManager | None:
    """Optional dependency — returns None if PrinterManager not initialized."""
    return _printer_manager


def set_printer_manager(manager: PrinterManager) -> None:
    """Register a PrinterManager instance (called during startup)."""
    global _printer_manager
    _printer_manager = manager
