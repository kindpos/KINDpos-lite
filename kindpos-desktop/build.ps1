# ---------------------------------------------------------------
# build.ps1 — Full build pipeline for KINDpos desktop wrapper
#
# Usage:
#   .\build.ps1              # build installers with embedded Python
#   .\build.ps1 -SkipPython  # skip Python download (already prepared)
#   .\build.ps1 -Dev         # run in dev mode
# ---------------------------------------------------------------
param(
    [switch]$SkipPython,
    [switch]$Dev
)
$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

$ResourcesDir = "src-tauri\resources"
$KindposLiteDir = Split-Path -Parent $ProjectDir  # assumes kindpos-desktop is inside kindpos-lite

# ── 1. Copy backend, frontend & overseer into resources ────────
Write-Host "==> Copying backend, frontend, and overseer into resources"

foreach ($dir in @("backend", "frontend", "overseer")) {
    $src = Join-Path $KindposLiteDir $dir
    $dst = Join-Path $ResourcesDir $dir
    if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
    Copy-Item -Recurse -Path $src -Destination $dst
    Write-Host "    $dir/ -> $dst"
}

# Remove dev artifacts.
foreach ($devDir in @("$ResourcesDir\backend\tests", "$ResourcesDir\backend\bombard",
                       "$ResourcesDir\backend\__pycache__", "$ResourcesDir\backend\.pytest_cache")) {
    if (Test-Path $devDir) { Remove-Item -Recurse -Force $devDir }
}

# Rename data/ dirs that collide with the root .gitignore **/data/ pattern.
# Tauri's bundler skips directories matched by .gitignore.
$menuData = Join-Path $ResourcesDir "frontend\js\data"
if (Test-Path $menuData) { Rename-Item $menuData "menu-data" }
$overseerData = Join-Path $ResourcesDir "overseer\src\data"
if (Test-Path $overseerData) { Rename-Item $overseerData "sample-data" }

# Update JS imports to match renamed directories.
Get-ChildItem -Recurse -Path "$ResourcesDir\frontend" -Filter "*.js" | ForEach-Object {
    (Get-Content $_.FullName) -replace "from '(\.\./|\./)?data/", "from '`$1menu-data/" | Set-Content $_.FullName
}
Get-ChildItem -Recurse -Path "$ResourcesDir\overseer" -Filter "*.js" | ForEach-Object {
    (Get-Content $_.FullName) -replace "from '(\.\./|\./)?data/", "from '`$1sample-data/" | Set-Content $_.FullName
}

# ── 2. Prepare embedded Python ─────────────────────────────────
$PythonDir = Join-Path $ResourcesDir "python"
if (-not $SkipPython) {
    if (-not (Test-Path "$PythonDir\python.exe")) {
        Write-Host "==> Embedded Python not found — running prepare-python.ps1"
        & "$ProjectDir\scripts\prepare-python.ps1"
    } else {
        Write-Host "==> Embedded Python already present — skipping download"
        Write-Host "    (use -SkipPython to skip, or delete resources\python\ to re-download)"
    }
} else {
    Write-Host "==> Skipping Python preparation (-SkipPython)"
}

# ── 3. Build ───────────────────────────────────────────────────
if ($Dev) {
    Write-Host "==> Starting Tauri dev mode"
    npx tauri dev
} else {
    Write-Host "==> Building Tauri release"
    npx tauri build

    # ── 4. Create Overseer copy ────────────────────────────────
    $ReleaseDir = "src-tauri\target\release"
    $MainExe = Join-Path $ReleaseDir "KINDpos.exe"
    $OverseerExe = Join-Path $ReleaseDir "KINDpos-Overseer.exe"

    if (Test-Path $MainExe) {
        Copy-Item $MainExe $OverseerExe
        Write-Host ""
        Write-Host "==> Build complete!"
        Write-Host "    KINDpos.exe          — POS Terminal (fullscreen kiosk)"
        Write-Host "    KINDpos-Overseer.exe — Admin Dashboard (windowed)"
        Write-Host ""
        Write-Host "    Installers:"
        Get-ChildItem -Recurse -Path "src-tauri\target\release\bundle" -Include "*.exe","*.msi" | ForEach-Object {
            Write-Host "    $($_.FullName)"
        }
    }
}
