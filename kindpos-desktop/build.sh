#!/usr/bin/env bash
# ---------------------------------------------------------------
# build.sh — Full build pipeline for KINDpos desktop wrapper
#
# Usage:
#   ./build.sh              # build NSIS + MSI installers
#   ./build.sh --dev        # run in dev mode (hot-reload webview)
# ---------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}"

RESOURCES_DIR="src-tauri/resources"

# ── 1. Copy backend & frontend into resources ──────────────────
echo "==> Copying backend and frontend into resources"

KINDPOS_LITE_DIR="${SCRIPT_DIR}/.."  # assumes kindpos-desktop is inside kindpos-lite

rm -rf "${RESOURCES_DIR}/backend" "${RESOURCES_DIR}/frontend"
mkdir -p "${RESOURCES_DIR}"

cp -r "${KINDPOS_LITE_DIR}/backend"  "${RESOURCES_DIR}/backend"
cp -r "${KINDPOS_LITE_DIR}/frontend" "${RESOURCES_DIR}/frontend"

# Remove dev artifacts that should not be bundled.
rm -rf "${RESOURCES_DIR}/backend/tests" \
       "${RESOURCES_DIR}/backend/__pycache__" \
       "${RESOURCES_DIR}/backend/.pytest_cache" \
       "${RESOURCES_DIR}/backend/bombard"

echo "    backend/  -> ${RESOURCES_DIR}/backend"
echo "    frontend/ -> ${RESOURCES_DIR}/frontend"

# ── 2. Prepare embedded Python (if not already present) ────────
if [ ! -d "${RESOURCES_DIR}/python" ]; then
    echo "==> Embedded Python not found — running prepare-python.sh"
    bash scripts/prepare-python.sh
else
    echo "==> Embedded Python already present — skipping download"
fi

# ── 3. Build ───────────────────────────────────────────────────
if [ "${1:-}" = "--dev" ]; then
    echo "==> Starting Tauri dev mode"
    npx tauri dev
else
    echo "==> Building Tauri release"
    npx tauri build --target x86_64-pc-windows-msvc

    echo ""
    echo "==> Build complete. Artifacts:"
    find src-tauri/target/release/bundle -type f \( -name "*.exe" -o -name "*.msi" \) 2>/dev/null || \
        echo "    (check src-tauri/target/release/bundle/)"
fi
