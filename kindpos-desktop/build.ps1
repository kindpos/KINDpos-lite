# ---------------------------------------------------------------
# build.ps1 - Full build pipeline for KINDpos desktop wrapper
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
$KindposLiteDir = Split-Path -Parent $ProjectDir

# --- 1. Copy backend, frontend & overseer into resources ---
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

# Rename data/ dirs that collide with root .gitignore **/data/ pattern.
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

# --- 2. Prepare embedded Python ---
$PythonDir = Join-Path $ResourcesDir "python"
if (-not $SkipPython) {
    if (-not (Test-Path "$PythonDir\python.exe")) {
        Write-Host "==> Embedded Python not found - running prepare-python.ps1"
        & "$ProjectDir\scripts\prepare-python.ps1"
    } else {
        Write-Host "==> Embedded Python already present - skipping download"
        Write-Host "    (use -SkipPython to skip, or delete resources\python\ to re-download)"
    }
} else {
    Write-Host "==> Skipping Python preparation (-SkipPython)"
}

# --- 3. Build ---
if ($Dev) {
    Write-Host "==> Starting Tauri dev mode"
    npx tauri dev
} else {
    Write-Host "==> Building Tauri release"
    npx tauri build

    # --- 4. Create distributable package with both exes ---
    $ReleaseDir = "src-tauri\target\release"
    $MainExe = Join-Path $ReleaseDir "KINDpos.exe"
    $DistDir = Join-Path $ReleaseDir "KINDpos-dist"

    if (Test-Path $MainExe) {
        # Create clean dist folder
        if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
        New-Item -ItemType Directory -Path $DistDir | Out-Null

        # Copy both executables
        Copy-Item $MainExe (Join-Path $DistDir "KINDpos.exe")
        Copy-Item $MainExe (Join-Path $DistDir "KINDpos-Overseer.exe")

        # Copy the resources directory (Python, backend, frontend, overseer)
        $ResSource = Join-Path $ReleaseDir "resources"
        if (Test-Path $ResSource) {
            Write-Host "    Copying resources into dist package..."
            Copy-Item -Recurse $ResSource (Join-Path $DistDir "resources")
        } else {
            Write-Host "    WARNING: resources/ not found at $ResSource"
            Write-Host "    Copying from src-tauri/resources/ instead..."
            Copy-Item -Recurse "src-tauri\resources" (Join-Path $DistDir "resources")
        }

        # Copy icons for shortcuts
        $IconsDir = Join-Path $DistDir "icons"
        New-Item -ItemType Directory -Path $IconsDir | Out-Null
        Copy-Item "src-tauri\icons\icon.ico" (Join-Path $IconsDir "KINDpos.ico") -ErrorAction SilentlyContinue
        Copy-Item "src-tauri\icons\overseer-icon.ico" (Join-Path $IconsDir "Overseer.ico") -ErrorAction SilentlyContinue

        # Create install script
        $installScript = @'
@echo off
echo Installing KINDpos...
set "INSTALL_DIR=%ProgramFiles%\KINDpos"
set "DESKTOP=%USERPROFILE%\Desktop"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\KINDpos"

:: Create install directory
mkdir "%INSTALL_DIR%" 2>nul
mkdir "%INSTALL_DIR%\icons" 2>nul
mkdir "%START_MENU%" 2>nul

:: Copy files
copy /Y "KINDpos.exe" "%INSTALL_DIR%\"
copy /Y "KINDpos-Overseer.exe" "%INSTALL_DIR%\"
copy /Y "icons\KINDpos.ico" "%INSTALL_DIR%\icons\"
copy /Y "icons\Overseer.ico" "%INSTALL_DIR%\icons\"
xcopy /E /I /Y "resources" "%INSTALL_DIR%\resources"

:: Create desktop shortcuts
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\KINDpos Terminal.lnk'); $s.TargetPath = '%INSTALL_DIR%\KINDpos.exe'; $s.IconLocation = '%INSTALL_DIR%\icons\KINDpos.ico'; $s.Save()"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\KINDpos Overseer.lnk'); $s.TargetPath = '%INSTALL_DIR%\KINDpos-Overseer.exe'; $s.IconLocation = '%INSTALL_DIR%\icons\Overseer.ico'; $s.Save()"

:: Create Start Menu shortcuts
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\KINDpos Terminal.lnk'); $s.TargetPath = '%INSTALL_DIR%\KINDpos.exe'; $s.IconLocation = '%INSTALL_DIR%\icons\KINDpos.ico'; $s.Save()"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\KINDpos Overseer.lnk'); $s.TargetPath = '%INSTALL_DIR%\KINDpos-Overseer.exe'; $s.IconLocation = '%INSTALL_DIR%\icons\Overseer.ico'; $s.Save()"

echo.
echo KINDpos installed successfully!
echo Shortcuts created on Desktop and Start Menu.
echo.
pause
'@
        Set-Content -Path (Join-Path $DistDir "install.bat") -Value $installScript

        # Create uninstall script
        $uninstallScript = @'
@echo off
echo Uninstalling KINDpos...
rmdir /S /Q "%ProgramFiles%\KINDpos" 2>nul
rmdir /S /Q "%LOCALAPPDATA%\KINDpos" 2>nul
del "%USERPROFILE%\Desktop\KINDpos Terminal.lnk" 2>nul
del "%USERPROFILE%\Desktop\KINDpos Overseer.lnk" 2>nul
rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\KINDpos" 2>nul
rmdir /S /Q "%APPDATA%\KINDpos" 2>nul
echo KINDpos uninstalled.
pause
'@
        Set-Content -Path (Join-Path $DistDir "uninstall.bat") -Value $uninstallScript

        # Create ZIP
        $ZipPath = Join-Path $ReleaseDir "KINDpos-1.2.0-setup.zip"
        if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
        Compress-Archive -Path "$DistDir\*" -DestinationPath $ZipPath

        Write-Host ""
        Write-Host "==> Build complete!"
        Write-Host "    KINDpos.exe          - POS Terminal (fullscreen kiosk)"
        Write-Host "    KINDpos-Overseer.exe - Admin Dashboard (windowed)"
        Write-Host ""
        Write-Host "    Distributable:"
        Write-Host "    $ZipPath"
        Write-Host ""
        Write-Host "    Share the ZIP. Recipient extracts and right-clicks"
        Write-Host "    install.bat -> Run as administrator."
    }
}
