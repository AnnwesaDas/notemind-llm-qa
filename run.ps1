param(
    [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
$backendRequirements = Join-Path $projectRoot "backend\requirements.txt"
$frontendDir = Join-Path $projectRoot "frontend"

if (-not (Test-Path $venvPython)) {
    throw "Python venv not found at '$venvPython'. Create it first with: python -m venv .venv"
}

if ($InstallDeps) {
    Write-Host "Installing backend dependencies..."
    & $venvPython -m pip install -r $backendRequirements

    Write-Host "Installing frontend dependencies..."
    Push-Location $frontendDir
    try {
        npm install
    }
    finally {
        Pop-Location
    }
}

$backendCommand = "Set-Location '$projectRoot'; & '$venvPython' -m uvicorn backend.app:app --reload"
$frontendCommand = "Set-Location '$frontendDir'; npm run dev"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $backendCommand
)

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $frontendCommand
)

Write-Host "Started backend (http://127.0.0.1:8000) and frontend (http://localhost:8080)."
Write-Host "Use -InstallDeps once if dependencies are not installed: .\run.ps1 -InstallDeps"
