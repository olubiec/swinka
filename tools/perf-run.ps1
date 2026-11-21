# Starts Cuy with CUY_PERF=1, waits until you close it, then prints the [PERF] lines from the log.
# Usage (repo root): powershell -ExecutionPolicy Bypass -File tools/perf-run.ps1 [-Config Debug|Release]
param([string]$Config = "Debug")
$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root "src\Cuy\bin\$Config\Cuy.exe"
if (-not (Test-Path $exe)) { Write-Host "Missing $exe - build first (tools/build.ps1)."; exit 1 }
$log = Join-Path $env:LocalAppData "Cuy\logs\cuy.log"
$before = if (Test-Path $log) { (Get-Content $log).Count } else { 0 }
$env:CUY_PERF = "1"
Write-Host "Cuy started with CUY_PERF=1. Drag and throw the pig a few times, then close the game."
Start-Process -FilePath $exe -Wait
Start-Sleep -Seconds 1
if (Test-Path $log) {
    Write-Host "---- PERF lines from this run ----"
    Get-Content $log | Select-Object -Skip $before | Select-String "PERF" | ForEach-Object { $_.Line }
} else { Write-Host "No log file found at $log" }
