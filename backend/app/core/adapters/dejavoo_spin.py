import httpx
import xml.etree.ElementTree as ET
import logging
import urllib.parse
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

from .base_payment import (
    BasePaymentDevice,
    PaymentDeviceConfig,
    PaymentDeviceStatus,
    TransactionRequest,
    TransactionResult,
    TransactionStatus,
    BatchResult,
    BatchStatus,
    PaymentType,
    EntryMethod,
    PaymentError,
    PaymentErrorCategory
)

logger = logging.getLogger("kindpos.payment.dejavoo")

# SPIn endpoint paths per transaction type
SPIN_ENDPOINTS = {
    "Sale":       "/spin/sale.html",
    "Return":     "/spin/return.html",
    "Void":       "/spin/void.html",
    "TipAdjust":  "/spin/tipadjust.html",
    "BatchClose": "/spin/settlement.html",
    "GetStatus":  "/spin/status.html",
    "Cancel":     "/spin/cancel.html",
}


class DejavooSPInAdapter(BasePaymentDevice):
    """
    Real hardware adapter for Dejavoo SPIn (LAN mode).
    Sends form-encoded XML to the device over HTTP on the local network.
    """

    def __init__(self):
        self._status = PaymentDeviceStatus.OFFLINE
        self._config: Optional[PaymentDeviceConfig] = None
        self._client = httpx.AsyncClient(timeout=95.0)

    @property
    def status(self) -> PaymentDeviceStatus:
        return self._status

    @property
    def config(self) -> Optional[PaymentDeviceConfig]:
        return self._config

    async def connect(self, config: PaymentDeviceConfig) -> bool:
        self._config = config
        status = await self.check_status()
        return status != PaymentDeviceStatus.OFFLINE

    async def disconnect(self) -> bool:
        await self._client.aclose()
        self._status = PaymentDeviceStatus.OFFLINE
        return True

    async def check_status(self) -> PaymentDeviceStatus:
        if self.in_sacred_state:
            return self._status

        try:
            xml = self._build_xml("GetStatus")
            response = await self._send_request("GetStatus", xml)
            if response:
                root = ET.fromstring(response)
                resp_msg = root.findtext("RespMSG")
                if resp_msg == "Ready":
                    self._status = PaymentDeviceStatus.IDLE
                elif resp_msg == "Busy":
                    if not self.in_sacred_state:
                        self._status = PaymentDeviceStatus.PROCESSING
                else:
                    self._status = PaymentDeviceStatus.ONLINE
            else:
                self._status = PaymentDeviceStatus.OFFLINE
        except Exception as e:
            logger.error(f"Dejavoo health check failed: {e}")
            self._status = PaymentDeviceStatus.OFFLINE

        return self._status

    async def initiate_sale(self, request: TransactionRequest) -> TransactionResult:
        xml = self._build_xml("Sale", {
            "Amount": f"{request.amount:.2f}",
            "InvNum": request.transaction_id[:10],  # SPIn max 10 chars
        })

        self._status = PaymentDeviceStatus.AWAITING_CARD
        try:
            response = await self._send_request("Sale", xml)
            return self._parse_response(response, request.transaction_id)
        finally:
            self._status = PaymentDeviceStatus.IDLE

    async def initiate_refund(self, request: TransactionRequest) -> TransactionResult:
        xml = self._build_xml("Return", {
            "Amount": f"{request.amount:.2f}",
            "InvNum": request.transaction_id[:10],
        })
        try:
            response = await self._send_request("Return", xml)
            return self._parse_response(response, request.transaction_id)
        finally:
            self._status = PaymentDeviceStatus.IDLE

    async def initiate_void(self, request: TransactionRequest) -> TransactionResult:
        xml = self._build_xml("Void", {
            "InvNum": request.transaction_id[:10],
        })
        try:
            response = await self._send_request("Void", xml)
            return self._parse_response(response, request.transaction_id)
        finally:
            self._status = PaymentDeviceStatus.IDLE

    async def cancel_transaction(self) -> bool:
        xml = self._build_xml("Cancel")
        try:
            response = await self._send_request("Cancel", xml)
            if response:
                root = ET.fromstring(response)
                return root.findtext("RespMSG") == "Cancelled"
        except:
            pass
        return False

    async def adjust_tip(self, transaction_id: str, tip_amount: Decimal) -> TransactionResult:
        """Send TipAdjust to Dejavoo so tip is included in batch settlement."""
        xml = self._build_xml("TipAdjust", {
            "InvNum": transaction_id[:10],
            "TipAmount": f"{tip_amount:.2f}",
        })
        try:
            response = await self._send_request("TipAdjust", xml)
            return self._parse_response(response, transaction_id)
        except Exception as e:
            logger.error(f"Tip adjust failed: {e}")
            return TransactionResult(
                transaction_id=transaction_id,
                status=TransactionStatus.ERROR,
                error=PaymentError(
                    category=PaymentErrorCategory.DEVICE,
                    error_code="TIP_ADJ_ERR",
                    message=str(e),
                    source="DejavooSPInAdapter",
                ),
            )

    async def close_batch(self) -> BatchResult:
        xml = self._build_xml("BatchClose")
        try:
            response = await self._send_request("BatchClose", xml)
            if response:
                root = ET.fromstring(response)
                success = root.findtext("RespMSG") == "Approved"
                return BatchResult(
                    batch_id=root.findtext("BatchID", "UNKNOWN"),
                    transaction_count=int(root.findtext("BatchCount", "0")),
                    total_amount=Decimal(root.findtext("BatchAmount", "0.00")),
                    status=BatchStatus.SUCCESS if success else BatchStatus.FAILED,
                    timestamp=datetime.now()
                )
        except Exception as e:
            return BatchResult(
                batch_id="ERROR",
                transaction_count=0,
                total_amount=Decimal("0.00"),
                status=BatchStatus.FAILED,
                error=PaymentError(
                    category=PaymentErrorCategory.SYSTEM,
                    error_code="BATCH_ERR",
                    message=str(e),
                    source="DejavooSPInAdapter"
                )
            )

    async def get_device_info(self) -> Dict[str, Any]:
        return {
            "adapter": "DejavooSPInAdapter",
            "protocol": "SPIn (LAN)",
            "config": self._config.dict() if self._config else None
        }

    async def get_capabilities(self) -> List[PaymentType]:
        return [PaymentType.SALE, PaymentType.REFUND, PaymentType.VOID]

    # ── SPIn protocol helpers ─────────────────────────────────────────────────

    def _build_xml(self, function: str, params: Dict[str, str] = None) -> str:
        """Build SPIn XML with RegisterId included."""
        root = ET.Element("request")
        func = ET.SubElement(root, "function")
        func.text = function

        reg = ET.SubElement(root, "RegisterId")
        reg.text = (self._config.register_id or '') if self._config else ''

        if params:
            for k, v in params.items():
                child = ET.SubElement(root, k)
                child.text = v

        return ET.tostring(root, encoding="unicode")

    async def _send_request(self, function: str, xml_body: str) -> Optional[str]:
        """Send form-encoded SPIn request: POST param=<xml> to /spin/<endpoint>.html"""
        if not self._config:
            return None

        endpoint = SPIN_ENDPOINTS.get(function, "/spin/sale.html")
        url = f"http://{self._config.ip_address}:{self._config.port}{endpoint}"

        try:
            logger.debug(f"SPIn → {url}: {xml_body}")
            print(f"  SPIn → {function} @ {self._config.ip_address}:{self._config.port}")
            response = await self._client.post(
                url,
                data={"param": xml_body},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            logger.debug(f"SPIn ← {response.text}")
            print(f"  SPIn ← {response.status_code} ({len(response.text)} bytes)")
            return response.text
        except httpx.RequestError as e:
            logger.error(f"SPIn request failed: {type(e).__name__}: {e}")
            print(f"  SPIn request failed: {type(e).__name__}: {e}")
            return None

    def _parse_response(self, response: Optional[str], expected_inv: str) -> TransactionResult:
        if not response:
            return TransactionResult(
                transaction_id=expected_inv,
                status=TransactionStatus.ERROR,
                error=PaymentError(
                    category=PaymentErrorCategory.NETWORK,
                    error_code="CONN_FAIL",
                    message="Could not reach payment device",
                    source="DejavooSPInAdapter"
                )
            )

        try:
            root = ET.fromstring(response)
            resp_msg = root.findtext("RespMSG") or root.findtext("Message") or ""

            status = TransactionStatus.ERROR
            if "Approved" in resp_msg:
                status = TransactionStatus.APPROVED
            elif "Declined" in resp_msg:
                status = TransactionStatus.DECLINED
            elif "Cancelled" in resp_msg:
                status = TransactionStatus.CANCELLED

            # Map entry mode
            entry_map = {
                "Swipe": EntryMethod.SWIPE,
                "Chip": EntryMethod.CHIP,
                "Contactless": EntryMethod.TAP,
                "Manual": EntryMethod.MANUAL
            }
            entry_mode = entry_map.get(root.findtext("EntryMode") or "", EntryMethod.TAP)

            return TransactionResult(
                transaction_id=root.findtext("InvNum") or expected_inv,
                status=status,
                authorization_code=root.findtext("AuthCode"),
                reference_number=root.findtext("Token"),
                card_brand=root.findtext("CardBrand"),
                last_four=root.findtext("LastFour"),
                entry_method=entry_mode,
                processor_response_code=root.findtext("ResultCode"),
                processor_message=resp_msg,
                timestamp=datetime.now()
            )

        except Exception as e:
            return TransactionResult(
                transaction_id=expected_inv,
                status=TransactionStatus.ERROR,
                error=PaymentError(
                    category=PaymentErrorCategory.SYSTEM,
                    error_code="PARSE_FAIL",
                    message=f"Failed to parse Dejavoo response: {e}",
                    source="DejavooSPInAdapter"
                )
            )
