# Restart the whole Antigravity loop with one command (Windows PowerShell).
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File tools\restart_loop.ps1
# What it does: stops old loop/orkiestra/agy processes, restores generated files, pulls the
# watchdog fix, resets hung tasks (RUNNING -> pending happens inside orkiestra), starts the
# battery guard and the loop runner in their own windows.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

Write-Host "1/5 Stopping old processes..."
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match "loop_runner|orkiestra|battery_guard" -and $_.ProcessId -ne $PID } |
  ForEach-Object { Write-Host "  stop PID $($_.ProcessId): $($_.CommandLine.Substring(0, [Math]::Min(90, $_.CommandLine.Length)))"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-Process -Name agy -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

Write-Host "2/5 Cleaning the working tree (only generated files)..."
git checkout main
git checkout -- README.md STAN_PROJEKTU.md TODO.md 2>$null
$dirty = git status --porcelain
if ($dirty) { Write-Host "STOP: uncommitted changes, fix them first:"; Write-Host $dirty; exit 1 }

Write-Host "3/5 Pulling the watchdog fix..."
git fetch origin
git merge --no-edit origin/fix/loop-watchdog
if ($LASTEXITCODE -ne 0) { Write-Host "STOP: merge conflict. Run: git merge --abort"; exit 1 }
git push origin main

Write-Host "4/5 Starting the battery guard..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repo'; python tools/battery_guard.py watch --threshold 20 --interval 30 --kill-agents"

Write-Host "5/5 Starting the loop runner..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repo'; python tools/loop_runner.py"

Write-Host "Done. Log: tools\loop_runner.log   Status: python -m orkiestra status"
