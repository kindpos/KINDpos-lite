# DEFERRED: mock_payment_device.py is out of sync with
# base_payment.py after TransactionRequest/TransactionResult
# refactor. Fix separately before payment Tier 2 work.

"""
KINDpos PaymentManager Test Suite
====================================
Nice. Dependable. Yours.

18 tests proving every payment scenario works — from happy path
approvals to Friday-night edge cases.

Uses Python's built-in unittest + asyncio. No external dependencies.
Tests run against a REAL SQLite EventLedger (in-memory) — test what you ship.

Test Coverage:
    1.  Register device
    2.  Unregister device
    3.  Approved payment (happy path)
    4.  Declined payment
    5.  Cash payment (no device needed)
    6.  No device available
    7.  Double-charge prevention (idempotency)
    8.  Device failover on hardware error
    9.  Declined doesn't failover
    10. Timeout handling
    11. Tip adjustment success
    12. Tip adjustment failure (entry still recorded)
    13. Refund success
    14. Void success
    15. Split payment start
    16. Split payment completion (all 3 splits)
    17. Device status summary
    18. Specific device override

Run with:
    cd KINDpos  (your project root)
    python -m pytest tests/test_payment_manager.py -v
    OR
    python -m tests.test_payment_manager

"Every dollar tracked. Every scenario tested."
"""

import asyncio
import uuid
import unittest
from typing import Optional

# =====================================================================
# IMPORTS — Using your real project structure
# =====================================================================
#
#   app/
#   ├── core/
#   │   ├── adapters/
#   │   │   ├── base_payment.py
#   │   │   ├── mock_payment_device.py
#   │   │   └── payment_manager.py
#   │   ├── events.py
#   │   └── event_ledger.py
#
# =====================================================================

from app.core.event_ledger import EventLedger

from app.core.adapters.base_payment import (
    PaymentDeviceConfig,
    PaymentDeviceType,
    PaymentDeviceStatus,
    PaymentType,
    TransactionStatus,
    TransactionRequest,
    TransactionResult,
)
from app.core.adapters.mock_payment_device import MockPaymentDevice
from app.core.adapters.payment_manager import PaymentManager


# =====================================================================
# HELPERS
# =====================================================================


def make_device(
    device_id: str = "device-01",
    name: str = "Front Register Reader",
) -> MockPaymentDevice:
    """Create a MockPaymentDevice with sensible defaults."""
    config = PaymentDeviceConfig(
        device_id=device_id,
        name=name,
        device_type=PaymentDeviceType.SMART_TERMINAL,
        connection_string="mock://localhost",
        processor="mock",
    )
    return MockPaymentDevice(config)


from app.core.events import EventType

def make_request(
    order_id: str = "order-001",
    amount: float = 58.00,
    payment_type: PaymentType = PaymentType.CREDIT_DEBIT,
    transaction_id: Optional[str] = None,
    terminal_id: str = "terminal-01",
) -> TransactionRequest:
    """Create a TransactionRequest with sensible defaults."""
    return TransactionRequest(
        transaction_id=transaction_id or str(uuid.uuid4()),
        order_id=order_id,
        amount=Decimal(str(amount)),
        payment_type=payment_type,
        terminal_id=terminal_id,
    )


async def make_ledger() -> EventLedger:
    """Create an in-memory EventLedger for testing.

    Each test gets its own isolated SQLite database — no collisions,
    no cleanup, no leftover state. In-memory is fast and disposable.
    """
    ledger = EventLedger(db_path=":memory:")
    await ledger.connect()
    return ledger


async def make_manager_async(ledger: Optional[EventLedger] = None) -> tuple:
    """Create a PaymentManager with a connected Event Ledger.

    Returns (manager, ledger) so tests can query the ledger directly.
    """
    if ledger is None:
        ledger = await make_ledger()
    manager = PaymentManager(
        ledger=ledger,
        terminal_id="terminal-01",
    )
    return manager, ledger


async def events_of_type(ledger: EventLedger, event_type) -> list:
    """Query the real SQLite ledger for events of a given type.

    Accepts EventType enum members (which is what PaymentEventTypes
    now resolves to after the integration).
    """
    return await ledger.get_events_by_type(event_type)


def run(coro):
    """Run an async coroutine synchronously.

    Uses asyncio.run() — clean event loop per call, no deprecation warnings.
    """
    return asyncio.run(coro)


# =====================================================================
# TEST 1-2: DEVICE REGISTRY
# =====================================================================


class Test01_RegisterDevice(unittest.TestCase):
    """Device connects and appears in the registry."""

    def test_register_device(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()

            result = await manager.register_device(device)

            self.assertTrue(result)
            self.assertIs(manager.get_device("device-01"), device)
            self.assertEqual(len(manager.get_all_devices()), 1)

            # Event Ledger recorded DEVICE_REGISTERED
            reg = await events_of_type(ledger, PaymentEventTypes.DEVICE_REGISTERED)
            self.assertEqual(len(reg), 1)
            self.assertEqual(reg[0].payload["device_id"], "device-01")

            await ledger.close()

        run(_test())


class Test02_UnregisterDevice(unittest.TestCase):
    """Device disconnects and disappears from registry."""

    def test_unregister_device(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()

            await manager.register_device(device)
            result = await manager.unregister_device("device-01")

            self.assertTrue(result)
            self.assertIsNone(manager.get_device("device-01"))
            self.assertEqual(len(manager.get_all_devices()), 0)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 3-6: CORE PAYMENT PROCESSING
# =====================================================================


class Test03_ApprovedPayment(unittest.TestCase):
    """Happy path — card approved, events recorded."""

    def test_approved(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            request = make_request(amount=58.00)
            result = await manager.process_payment(request)

            self.assertTrue(result.success)
            self.assertEqual(result.transaction_status, TransactionStatus.APPROVED)
            self.assertEqual(result.card_last_four, "4242")
            self.assertEqual(result.card_brand, "visa")
            self.assertEqual(result.amount_authorized, 58.00)

            # INITIATED then APPROVED in ledger
            initiated = await events_of_type(ledger, PaymentEventTypes.PAYMENT_INITIATED)
            approved = await events_of_type(ledger, PaymentEventTypes.PAYMENT_APPROVED)
            self.assertEqual(len(initiated), 1)
            self.assertEqual(len(approved), 1)
            self.assertEqual(initiated[0].payload["amount"], 58.00)

            await ledger.close()

        run(_test())


class Test04_DeclinedPayment(unittest.TestCase):
    """Card declined — clear message, proper event."""

    def test_declined(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            device.set_fail_mode("declined")
            await manager.register_device(device)

            request = make_request(amount=42.00)
            result = await manager.process_payment(request)

            self.assertFalse(result.success)
            self.assertEqual(result.transaction_status, TransactionStatus.DECLINED)
            self.assertIsNotNone(result.decline_reason)

            declined = await events_of_type(ledger, PaymentEventTypes.PAYMENT_DECLINED)
            self.assertEqual(len(declined), 1)

            await ledger.close()

        run(_test())


class Test05_CashPayment(unittest.TestCase):
    """Cash — no device needed, every dollar still tracked."""

    def test_cash(self):
        async def _test():
            manager, ledger = await make_manager_async()
            # No device registered

            request = make_request(amount=25.00, payment_method=PaymentMethod.CASH)
            result = await manager.process_payment(request)

            self.assertTrue(result.success)
            self.assertEqual(result.transaction_status, TransactionStatus.APPROVED)
            self.assertIn("cash_", result.transaction_id)

            initiated = await events_of_type(ledger, PaymentEventTypes.PAYMENT_INITIATED)
            approved = await events_of_type(ledger, PaymentEventTypes.PAYMENT_APPROVED)
            self.assertEqual(len(initiated), 1)
            self.assertEqual(len(approved), 1)
            self.assertEqual(initiated[0].payload["payment_method"], "cash")

            await ledger.close()

        run(_test())


class Test06_NoDeviceAvailable(unittest.TestCase):
    """No reader connected — clear error returned."""

    def test_no_device(self):
        async def _test():
            manager, ledger = await make_manager_async()

            request = make_request(amount=58.00)
            result = await manager.process_payment(request)

            self.assertFalse(result.success)
            self.assertEqual(result.error_code, "no_device_available")
            self.assertEqual(result.transaction_status, TransactionStatus.ERROR)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 7: DOUBLE-CHARGE PREVENTION
# =====================================================================


class Test07_DoubleChargePrevention(unittest.TestCase):
    """Same payment_id submitted twice — second attempt BLOCKED."""

    def test_idempotency(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            fixed_id = str(uuid.uuid4())

            # First attempt — succeeds
            r1 = make_request(payment_id=fixed_id, amount=58.00)
            result1 = await manager.process_payment(r1)
            self.assertTrue(result1.success)

            # Second attempt — blocked
            r2 = make_request(payment_id=fixed_id, amount=58.00)
            result2 = await manager.process_payment(r2)
            self.assertFalse(result2.success)
            self.assertEqual(result2.error_code, "duplicate_blocked")

            # Only ONE approved event
            approved = await events_of_type(ledger, PaymentEventTypes.PAYMENT_APPROVED)
            self.assertEqual(len(approved), 1)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 8-9: FAILOVER
# =====================================================================


class Test08_DeviceFailover(unittest.TestCase):
    """Primary offline, alternate picks up. Customer never knows."""

    def test_failover(self):
        async def _test():
            manager, ledger = await make_manager_async()

            primary = make_device(device_id="device-01", name="Front Reader")
            primary.set_fail_mode("offline")
            await manager.register_device(primary)

            alternate = make_device(device_id="device-02", name="Bar Reader")
            await manager.register_device(alternate)

            request = make_request(amount=58.00)
            result = await manager.process_payment(request)

            self.assertTrue(result.success)
            self.assertEqual(result.device_id, "device-02")

            await ledger.close()

        run(_test())


class Test09_DeclinedNoFailover(unittest.TestCase):
    """Declined card stays declined — same card, same result."""

    def test_no_failover_on_decline(self):
        async def _test():
            manager, ledger = await make_manager_async()

            primary = make_device(device_id="device-01", name="Front Reader")
            primary.set_fail_mode("declined")
            await manager.register_device(primary)

            alternate = make_device(device_id="device-02", name="Bar Reader")
            await manager.register_device(alternate)

            request = make_request(amount=58.00)
            result = await manager.process_payment(request)

            self.assertFalse(result.success)
            self.assertEqual(result.transaction_status, TransactionStatus.DECLINED)
            self.assertEqual(result.device_id, "device-01")

            # Only one INITIATED — alternate was never tried
            initiated = await events_of_type(ledger, PaymentEventTypes.PAYMENT_INITIATED)
            self.assertEqual(len(initiated), 1)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 10: TIMEOUT
# =====================================================================


class Test10_Timeout(unittest.TestCase):
    """Customer walks away — clean timeout, clear feedback."""

    def test_timeout(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            device.set_fail_mode("timeout")
            await manager.register_device(device)

            request = make_request(amount=58.00)
            result = await manager.process_payment(request)

            self.assertFalse(result.success)
            self.assertEqual(result.transaction_status, TransactionStatus.TIMED_OUT)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 11-12: TIP WORKFLOW
# =====================================================================


class Test11_TipSuccess(unittest.TestCase):
    """Tip added after auth — three events in the audit trail."""

    def test_tip_adjustment(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            # Original payment
            request = make_request(amount=58.00)
            pay_result = await manager.process_payment(request)
            self.assertTrue(pay_result.success)

            # Server enters tip
            tip = TipAdjustment(
                original_payment_id=request.payment_id,
                original_transaction_id=pay_result.transaction_id,
                order_id=request.order_id,
                tip_amount=12.00,
                total_amount=70.00,
                server_id="server-01",
                server_name="Maria",
            )
            tip_result = await manager.process_tip(tip)
            self.assertTrue(tip_result.success)

            # Three-event trail: payment approved, tip added, tip confirmed
            tip_added = await events_of_type(ledger, PaymentEventTypes.TIP_ADDED)
            tip_confirmed = await events_of_type(ledger, PaymentEventTypes.TIP_ADJUST_CONFIRMED)
            self.assertEqual(len(tip_added), 1)
            self.assertEqual(len(tip_confirmed), 1)
            self.assertEqual(tip_added[0].payload["tip_amount"], 12.00)

            await ledger.close()

        run(_test())


class Test12_TipFailureStillRecordsEntry(unittest.TestCase):
    """Device fails on tip adjust — but TIP_ADDED is already saved."""

    def test_tip_entry_preserved(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            # Original payment
            request = make_request(amount=58.00)
            pay_result = await manager.process_payment(request)
            self.assertTrue(pay_result.success)

            # Device goes offline before tip adjust
            device.set_fail_mode("offline")
            device._connected = False
            device._status = PaymentDeviceStatus.OFFLINE

            tip = TipAdjustment(
                original_payment_id=request.payment_id,
                original_transaction_id=pay_result.transaction_id,
                order_id=request.order_id,
                tip_amount=10.00,
                total_amount=68.00,
                server_id="server-01",
                server_name="Maria",
            )
            tip_result = await manager.process_tip(tip)
            self.assertFalse(tip_result.success)

            # TIP_ADDED recorded BEFORE device call — entry preserved
            tip_added = await events_of_type(ledger, PaymentEventTypes.TIP_ADDED)
            self.assertEqual(len(tip_added), 1)
            self.assertEqual(tip_added[0].payload["tip_amount"], 10.00)

            # TIP_ADJUST_FAILED also recorded
            tip_failed = await events_of_type(ledger, PaymentEventTypes.TIP_ADJUST_FAILED)
            self.assertEqual(len(tip_failed), 1)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 13-14: REFUNDS & VOIDS
# =====================================================================


class Test13_RefundSuccess(unittest.TestCase):
    """Refund to original card — full audit trail."""

    def test_refund(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            # Original payment
            request = make_request(amount=58.00)
            pay_result = await manager.process_payment(request)
            self.assertTrue(pay_result.success)

            # Refund
            refund_req = make_request(
                order_id=request.order_id,
                amount=58.00,
                transaction_type=TransactionType.REFUND,
                reference_transaction_id=pay_result.transaction_id,
                reference_payment_id=request.payment_id,
            )
            refund_result = await manager.process_refund(refund_req)
            self.assertTrue(refund_result.success)

            refunded = await events_of_type(ledger, PaymentEventTypes.PAYMENT_REFUNDED)
            self.assertEqual(len(refunded), 1)
            self.assertEqual(refunded[0].payload["amount_refunded"], 58.00)

            await ledger.close()

        run(_test())


class Test14_VoidSuccess(unittest.TestCase):
    """Void before settlement — cheaper, faster."""

    def test_void(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            # Original payment
            request = make_request(amount=42.00)
            pay_result = await manager.process_payment(request)
            self.assertTrue(pay_result.success)

            # Void
            void_req = make_request(
                order_id=request.order_id,
                amount=42.00,
                transaction_type=TransactionType.VOID,
                reference_transaction_id=pay_result.transaction_id,
                reference_payment_id=request.payment_id,
            )
            void_result = await manager.process_void(void_req)
            self.assertTrue(void_result.success)

            voided = await events_of_type(ledger, PaymentEventTypes.PAYMENT_VOIDED)
            self.assertEqual(len(voided), 1)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 15-16: SPLIT PAYMENTS
# =====================================================================


class Test15_SplitStart(unittest.TestCase):
    """Start a split — tracking initialized, event recorded."""

    def test_split_start(self):
        async def _test():
            manager, ledger = await make_manager_async()

            await manager.start_split("order-001", num_splits=3)

            started = await events_of_type(ledger, PaymentEventTypes.SPLIT_STARTED)
            self.assertEqual(len(started), 1)
            self.assertEqual(started[0].payload["order_id"], "order-001")
            self.assertEqual(started[0].payload["num_splits"], 3)

            await ledger.close()

        run(_test())


class Test16_SplitCompletion(unittest.TestCase):
    """Three-way split — all complete, SPLIT_COMPLETED fires."""

    def test_split_all_complete(self):
        async def _test():
            manager, ledger = await make_manager_async()
            device = make_device()
            await manager.register_device(device)

            await manager.start_split("order-001", num_splits=3)

            for i in range(3):
                req = make_request(
                    order_id="order-001",
                    amount=20.00,
                    is_split=True,
                    split_index=i,
                    split_total=3,
                )
                result = await manager.process_payment(req)
                self.assertTrue(result.success)

            # 3 individual splits recorded
            splits = await events_of_type(ledger, PaymentEventTypes.SPLIT_PAYMENT_COMPLETED)
            self.assertEqual(len(splits), 3)

            # ALL_COMPLETED fires once
            all_done = await events_of_type(ledger, PaymentEventTypes.SPLIT_COMPLETED)
            self.assertEqual(len(all_done), 1)
            self.assertEqual(all_done[0].payload["total_splits"], 3)

            # Tracking cleaned up
            self.assertNotIn("order-001", manager._active_splits)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 17: DIAGNOSTICS
# =====================================================================


class Test17_PaymentSummary(unittest.TestCase):
    """get_payment_summary returns correct device counts."""

    def test_summary(self):
        async def _test():
            manager, ledger = await make_manager_async()

            d1 = make_device(device_id="device-01", name="Front Reader")
            await manager.register_device(d1)

            d2 = make_device(device_id="device-02", name="Bar Reader")
            await manager.register_device(d2)

            d3 = make_device(device_id="device-03", name="Patio Reader")
            await manager.register_device(d3)
            # Simulate offline
            d3._connected = False
            d3._status = PaymentDeviceStatus.OFFLINE

            summary = manager.get_payment_summary()

            self.assertEqual(summary["total_devices"], 3)
            self.assertEqual(summary["ready"], 2)
            self.assertGreaterEqual(summary["offline"], 1)

            await ledger.close()

        run(_test())


# =====================================================================
# TEST 18: DEVICE OVERRIDE
# =====================================================================


class Test18_SpecificDeviceOverride(unittest.TestCase):
    """request.target_device_id is honored."""

    def test_device_override(self):
        async def _test():
            manager, ledger = await make_manager_async()

            d1 = make_device(device_id="device-01", name="Front Reader")
            await manager.register_device(d1)

            d2 = make_device(device_id="device-02", name="Bar Reader")
            await manager.register_device(d2)

            request = make_request(amount=58.00, target_device_id="device-02")
            result = await manager.process_payment(request)

            self.assertTrue(result.success)
            self.assertEqual(result.device_id, "device-02")

            await ledger.close()

        run(_test())


# =====================================================================
# RUN
# =====================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("KINDpos PaymentManager Test Suite")
    print("Nice. Dependable. Yours.")
    print("=" * 70)
    print()
    unittest.main(verbosity=2)