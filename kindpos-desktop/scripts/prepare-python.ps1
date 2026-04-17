# ---------------------------------------------------------------
# prepare-python.ps1
# Downloads the Python 3.12 embeddable package (Windows x64) and
# installs the backend's pip dependencies into it.
#
# Output: src-tauri\resources\python\  (ready to bundle)
# ---------------------------------------------------------------
$ErrorActionPreference = "Stop"

$PythonVersion = "3.12.2"
$PythonZip = "python-$PythonVersion-embed-amd64.zip"
$PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/$PythonZip"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ResourcesDir = Join-Path $ProjectDir "src-tauri\resources"
$PythonDir = Join-Path $ResourcesDir "python"

Write-Host "==> Preparing embedded Python $PythonVersion"

# 1. Download the embeddable zip if not cached.
if (-not (Test-Path $ResourcesDir)) { New-Item -ItemType Directory -Path $ResourcesDir | Out-Null }
$ZipPath = Join-Path $ResourcesDir $PythonZip
if (-not (Test-Path $ZipPath)) {
    Write-Host "    Downloading $PythonUrl"
    Invoke-WebRequest -Uri $PythonUrl -OutFile $ZipPath -UseBasicParsing
}

# 2. Extract into resources\python\
if (Test-Path $PythonDir) { Remove-Item -Recurse -Force $PythonDir }
New-Item -ItemType Directory -Path $PythonDir | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $PythonDir

# 3. Enable pip — uncomment the "import site" line in python312._pth
$PthFile = Get-ChildItem -Path $PythonDir -Filter "python*._pth" | Select-Object -First 1
if ($PthFile) {
    $content = Get-Content $PthFile.FullName
    $content = $content -replace "^#import site", "import site"
    Set-Content -Path $PthFile.FullName -Value $content
    Write-Host "    Enabled site-packages via $($PthFile.Name)"
}

# 4. Bootstrap pip.
Write-Host "    Installing pip"
$GetPipPath = Join-Path $PythonDir "get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $GetPipPath -UseBasicParsing
$PythonExe = Join-Path $PythonDir "python.exe"
& $PythonExe $GetPipPath --no-warn-script-location 2>$null

# 5. Install backend requirements.
$Requirements = Join-Path $ProjectDir "..\backend\requirements.txt"
if (-not (Test-Path $Requirements)) {
    $Requirements = Join-Path $ResourcesDir "backend\requirements.txt"
}

if (Test-Path $Requirements) {
    Write-Host "    Installing requirements from $Requirements"
    # Install to Lib subfolder so the embedded Python can find them.
    $LibDir = Join-Path $PythonDir "Lib"
    & $PythonExe -m pip install `
        --no-warn-script-location `
        --target $LibDir `
        -r $Requirements
} else {
    Write-Host "    WARNING: requirements.txt not found — skipping pip install"
}

# 6. Clean up pip cache and installer to reduce bundle size.
$PipCache = Join-Path $PythonDir "Lib\pip"
if (Test-Path $PipCache) { Remove-Item -Recurse -Force $PipCache }
Remove-Item -Force $GetPipPath -ErrorAction SilentlyContinue

$Size = "{0:N1} MB" -f ((Get-ChildItem -Recurse -Path $PythonDir | Measure-Object -Property Length -Sum).Sum / 1MB)
Write-Host "==> Embedded Python ready at $PythonDir"
Write-Host "    Size: $Size"
