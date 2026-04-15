#!/usr/bin/env bash
# ---------------------------------------------------------------
# prepare-python.sh
# Downloads the Python 3.12 embeddable package (Windows x64) and
# installs the backend's pip dependencies into it.
#
# Output: src-tauri/resources/python/  (ready to bundle)
# ---------------------------------------------------------------
set -euo pipefail

PYTHON_VERSION="3.12.2"
PYTHON_ZIP="python-${PYTHON_VERSION}-embed-amd64.zip"
PYTHON_URL="https://www.python.org/ftp/python/${PYTHON_VERSION}/${PYTHON_ZIP}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="${PROJECT_DIR}/src-tauri/resources"
PYTHON_DIR="${RESOURCES_DIR}/python"

echo "==> Preparing embedded Python ${PYTHON_VERSION}"

# 1. Download the embeddable zip if not cached.
mkdir -p "${RESOURCES_DIR}"
if [ ! -f "${RESOURCES_DIR}/${PYTHON_ZIP}" ]; then
    echo "    Downloading ${PYTHON_URL}"
    curl -fSL -o "${RESOURCES_DIR}/${PYTHON_ZIP}" "${PYTHON_URL}"
fi

# 2. Extract into resources/python/
rm -rf "${PYTHON_DIR}"
mkdir -p "${PYTHON_DIR}"
unzip -q "${RESOURCES_DIR}/${PYTHON_ZIP}" -d "${PYTHON_DIR}"

# 3. Enable pip — uncomment the "import site" line in python312._pth
PTH_FILE=$(ls "${PYTHON_DIR}"/python*._pth 2>/dev/null | head -1)
if [ -n "${PTH_FILE}" ]; then
    sed -i 's/^#import site/import site/' "${PTH_FILE}"
    echo "    Enabled site-packages via ${PTH_FILE}"
fi

# 4. Bootstrap pip.
echo "    Installing pip"
curl -fsSL https://bootstrap.pypa.io/get-pip.py -o "${PYTHON_DIR}/get-pip.py"
"${PYTHON_DIR}/python.exe" "${PYTHON_DIR}/get-pip.py" --no-warn-script-location 2>/dev/null || \
    echo "    (pip bootstrap ran — check output above)"

# 5. Install backend requirements into the embedded Lib/ folder.
REQUIREMENTS="${PROJECT_DIR}/../backend/requirements.txt"
if [ ! -f "${REQUIREMENTS}" ]; then
    REQUIREMENTS="${PROJECT_DIR}/src-tauri/resources/backend/requirements.txt"
fi

if [ -f "${REQUIREMENTS}" ]; then
    echo "    Installing requirements from ${REQUIREMENTS}"
    "${PYTHON_DIR}/python.exe" -m pip install \
        --no-warn-script-location \
        --target "${PYTHON_DIR}/Lib" \
        -r "${REQUIREMENTS}"
else
    echo "    WARNING: requirements.txt not found — skipping pip install"
fi

echo "==> Embedded Python ready at ${PYTHON_DIR}"
echo "    Size: $(du -sh "${PYTHON_DIR}" | cut -f1)"
