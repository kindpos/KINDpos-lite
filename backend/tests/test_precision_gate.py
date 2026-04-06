"""
Tests for the precision gate in EventLedger.

Verifies _check_monetary_precision() identifies non-2dp values,
and that the ledger warns (but does not reject) on bad precision.
"""

import logging
import os
import pytest
from app.core.event_ledger import EventLedger, _check_monetary_precision, _MONETARY_KEYS
from app.core.events import create_event, EventType, payment_initiated


class TestCheckMonetaryPrecision:

    def test_check_monetary_precision_clean(self):
        payload = {"price": 10.00, "amount": 5.50}
        assert _check_monetary_precision(payload) == []

    def test_check_monetary_precision_3dp(self):
        payload = {"price": 10.333}
        result = _check_monetary_precision(payload)
        assert len(result) == 1
        assert "price=10.333" in result[0]

    def test_check_monetary_precision_multiple_bad(self):
        payload = {"price": 1.111, "amount": 2.222}
        result = _check_monetary_precision(payload)
        assert len(result) == 2
        keys_found = {r.split("=")[0] for r in result}
        assert keys_found == {"price", "amount"}

    def test_check_monetary_precision_non_monetary_keys_ignored(self):
        payload = {"name": "test", "quantity": 3.333}
        assert _check_monetary_precision(payload) == []

    def test_check_monetary_precision_integers_ok(self):
        payload = {"price": 10}
        assert _check_monetary_precision(payload) == []

    def test_check_monetary_precision_none_values_ok(self):
        payload = {"price": None}
        assert _check_monetary_precision(payload) == []


class TestLedgerPrecisionWarnings:

    @pytest.fixture
    def tmp_db(self, tmp_path):
        return str(tmp_path / "test_precision.db")

    async def test_ledger_warns_on_bad_precision(self, tmp_db, caplog):
        event = create_event(
            event_type=EventType.PAYMENT_INITIATED,
            terminal_id="T1",
            payload={
                "order_id": "order-1",
                "payment_id": "p1",
                "amount": 10.333,
                "method": "card",
            },
            correlation_id="order-1",
        )

        with caplog.at_level(logging.WARNING, logger="kindpos.ledger"):
            async with EventLedger(tmp_db) as ledger:
                await ledger.append(event)

        assert any("Precision gate" in record.message for record in caplog.records)

    async def test_ledger_still_appends_on_bad_precision(self, tmp_db):
        event = create_event(
            event_type=EventType.PAYMENT_INITIATED,
            terminal_id="T1",
            payload={
                "order_id": "order-1",
                "payment_id": "p1",
                "amount": 10.333,
                "method": "card",
            },
            correlation_id="order-1",
        )

        async with EventLedger(tmp_db) as ledger:
            result = await ledger.append(event)
            assert result.sequence_number is not None
            assert result.sequence_number >= 1

            # Verify it's actually stored
            count = await ledger.count_events()
            assert count == 1
