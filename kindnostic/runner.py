"""KINDnostic runner — discovers and executes probes, records results."""

import importlib
import os
import pkgutil
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from typing import Callable, Optional

import kindnostic.probes
from kindnostic.alerts import AlertQueue
from kindnostic.entomology import write_boot_diagnostic
from kindnostic.storage import BootStorage
from kindnostic.support_codes import generate_support_code
from kindnostic.types import Category, ProbeResult, Status

PROBE_TIMEOUT_S = 2.0
DEFAULT_DB_PATH = "./data/diagnostic_boot.db"


def discover_probes() -> list[tuple[str, Callable, Category]]:
    """Scan kindnostic.probes for probe_* functions.

    Returns list of (name, callable, category) sorted by category
    (CRITICAL first, then HIGH, then LOW).
    """
    probes: list[tuple[str, Callable, Category]] = []

    package_path = kindnostic.probes.__path__
    for importer, module_name, is_pkg in pkgutil.iter_modules(package_path):
        module = importlib.import_module(f"kindnostic.probes.{module_name}")
        category = getattr(module, "CATEGORY", Category.LOW)

        for attr_name in dir(module):
            if attr_name.startswith("probe_") and callable(getattr(module, attr_name)):
                fn = getattr(module, attr_name)
                probes.append((attr_name, fn, category))

    probes.sort(key=lambda p: p[2])
    return probes


def run_probe(
    fn: Callable, category: Category, timeout: float = PROBE_TIMEOUT_S
) -> tuple[ProbeResult, int]:
    """Execute a single probe with timeout enforcement.

    Returns (result, duration_ms).
    CRITICAL timeout → FAIL, HIGH/LOW timeout → WARN.
    Any unhandled exception → FAIL.
    """
    probe_name = fn.__name__.removeprefix("probe_")
    start = time.monotonic()

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(fn)
            result = future.result(timeout=timeout)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return result, elapsed_ms

    except TimeoutError:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        timeout_status = Status.FAIL if category == Category.CRITICAL else Status.WARN
        return ProbeResult(
            probe_name=probe_name,
            category=category,
            status=timeout_status,
            message=f"Probe timed out after {timeout}s",
            metadata={"timeout_seconds": timeout},
        ), elapsed_ms

    except Exception as exc:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return ProbeResult(
            probe_name=probe_name,
            category=category,
            status=Status.FAIL,
            message=f"Probe raised exception: {exc}",
            metadata={"exception": type(exc).__name__, "detail": str(exc)},
        ), elapsed_ms


def run_all(db_path: Optional[str] = None) -> int:
    """Main entry point. Discover probes, execute, store results, return exit code.

    Returns 0 if no CRITICAL probes failed, 1 if any did.
    """
    if db_path is None:
        db_path = DEFAULT_DB_PATH

    boot_id = str(uuid.uuid4())
    start = time.monotonic()

    probes = discover_probes()

    results: list[tuple[ProbeResult, int]] = []
    for name, fn, category in probes:
        result, duration_ms = run_probe(fn, category)
        results.append((result, duration_ms))

    total_ms = int((time.monotonic() - start) * 1000)

    # Determine outcome
    has_critical_fail = any(
        r.status == Status.FAIL and r.category == Category.CRITICAL
        for r, _ in results
    )
    outcome = "BLOCKED" if has_critical_fail else "READY"
    exit_code = 1 if has_critical_fail else 0

    # Persist
    passed = sum(1 for r, _ in results if r.status == Status.PASS)
    warned = sum(1 for r, _ in results if r.status == Status.WARN)
    failed = sum(1 for r, _ in results if r.status == Status.FAIL)

    with BootStorage(db_path) as storage:
        for result, duration_ms in results:
            storage.record_result(
                boot_id=boot_id,
                probe_name=result.probe_name,
                category=result.category.value,
                status=result.status.value,
                duration_ms=duration_ms,
                message=result.message,
                metadata=result.metadata,
            )
        storage.record_summary(
            boot_id=boot_id,
            total_probes=len(results),
            passed=passed,
            warned=warned,
            failed=failed,
            duration_ms=total_ms,
            outcome=outcome,
        )

    # Write BOOT_DIAGNOSTIC event to Entomology
    try:
        write_boot_diagnostic(
            boot_id=boot_id,
            outcome=outcome,
            results=results,
            total_duration_ms=total_ms,
            db_path=db_path,
        )
    except Exception:
        pass  # Entomology integration is best-effort

    # Enqueue alert if any failures/warnings
    try:
        with AlertQueue(db_path) as alerts:
            alerts.enqueue(
                boot_id=boot_id,
                terminal_id=os.environ.get("KINDPOS_TERMINAL_ID", "terminal_01"),
                results=results,
            )
            alerts.flush()  # Attempt to send if webhook configured
    except Exception:
        pass  # Alert queue is best-effort

    return exit_code
