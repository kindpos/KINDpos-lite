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

    # --- 4. Create two distributable packages (Terminal + Overseer) ---
    $ReleaseDir = "src-tauri\target\release"
    $MainExe = Join-Path $ReleaseDir "KINDpos.exe"

    if (Test-Path $MainExe) {
        $ResSource = Join-Path $ReleaseDir "resources"
        if (-not (Test-Path $ResSource)) { $ResSource = "src-tauri\resources" }

        function Build-Package {
            param(
                [string]$AppName,      # "Terminal" or "Overseer"
                [string]$ExeName,      # "KINDpos.exe" or "KINDpos-Overseer.exe"
                [string]$ShortcutName, # "KINDpos Terminal" or "KINDpos Overseer"
                [string]$IconSrc       # source .ico path
            )
            $DistDir = Join-Path $ReleaseDir "KINDpos-$AppName-dist"
            if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
            New-Item -ItemType Directory -Path $DistDir | Out-Null

            # Copy single exe
            Copy-Item $MainExe (Join-Path $DistDir $ExeName)

            # Copy resources
            Write-Host "    Copying resources for $AppName..."
            Copy-Item -Recurse $ResSource (Join-Path $DistDir "resources")

            # Copy icon
            $IconDst = Join-Path $DistDir "app.ico"
            Copy-Item $IconSrc $IconDst -ErrorAction SilentlyContinue

            # Create install script
            $installScript = @"
@echo off
echo Installing KINDpos $AppName...
set "INSTALL_DIR=%ProgramFiles%\KINDpos-$AppName"
set "DESKTOP=%USERPROFILE%\Desktop"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\KINDpos"

mkdir "%INSTALL_DIR%" 2>nul
mkdir "%START_MENU%" 2>nul

copy /Y "$ExeName" "%INSTALL_DIR%\"
copy /Y "app.ico" "%INSTALL_DIR%\"
xcopy /E /I /Y "resources" "%INSTALL_DIR%\resources"

powershell -Command "`$ws = New-Object -ComObject WScript.Shell; `$s = `$ws.CreateShortcut('%DESKTOP%\$ShortcutName.lnk'); `$s.TargetPath = '%INSTALL_DIR%\$ExeName'; `$s.IconLocation = '%INSTALL_DIR%\app.ico'; `$s.Save()"
powershell -Command "`$ws = New-Object -ComObject WScript.Shell; `$s = `$ws.CreateShortcut('%START_MENU%\$ShortcutName.lnk'); `$s.TargetPath = '%INSTALL_DIR%\$ExeName'; `$s.IconLocation = '%INSTALL_DIR%\app.ico'; `$s.Save()"

echo.
echo KINDpos $AppName installed successfully!
echo Shortcut created on Desktop and Start Menu.
echo.
pause
"@
            Set-Content -Path (Join-Path $DistDir "install.bat") -Value $installScript

            # Create uninstall script
            $uninstallScript = @"
@echo off
echo Uninstalling KINDpos $AppName...
rmdir /S /Q "%ProgramFiles%\KINDpos-$AppName" 2>nul
del "%USERPROFILE%\Desktop\$ShortcutName.lnk" 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\KINDpos\$ShortcutName.lnk" 2>nul
rmdir /S /Q "%APPDATA%\KINDpos" 2>nul
echo KINDpos $AppName uninstalled.
pause
"@
            Set-Content -Path (Join-Path $DistDir "uninstall.bat") -Value $uninstallScript

            # Create ZIP
            $ZipPath = Join-Path $ReleaseDir "KINDpos-$AppName-1.3.0.zip"
            if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
            Compress-Archive -Path "$DistDir\*" -DestinationPath $ZipPath
            return $ZipPath
        }

        $TerminalZip = Build-Package -AppName "Terminal" -ExeName "KINDpos.exe" `
            -ShortcutName "KINDpos Terminal" -IconSrc "src-tauri\icons\icon.ico"

        $OverseerZip = Build-Package -AppName "Overseer" -ExeName "KINDpos-Overseer.exe" `
            -ShortcutName "KINDpos Overseer" -IconSrc "src-tauri\icons\overseer-icon.ico"

        Write-Host ""
        Write-Host "==> Build complete!"
        Write-Host ""
        Write-Host "    Two separate distributables:"
        Write-Host "      $TerminalZip"
        Write-Host "      $OverseerZip"
        Write-Host ""
        Write-Host "    Each ZIP: extract, right-click install.bat -> Run as administrator."
    }
}
