# Cheap verification that prints only failures (max -MaxLines lines), so agents and humans do not read full logs.
# Examples:
#   tools/verify.ps1 -Tests PlaceUnlockTests,ComfortTests
#   tools/verify.ps1 -Tests FarmEngineTests -Build
#   tools/verify.ps1 -Js web/home/app.js,web/home/bridge.js -Smoke
#   tools/verify.ps1 -Full            # all Core tests + app build (end of a stage)
param(
    [string[]]$Tests = @(),
    [switch]$Build,
    [string[]]$Js = @(),
    [switch]$Smoke,
    [switch]$Full,
    [int]$MaxLines = 40
)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$script:failed = $false

function Invoke-Step([string]$Name, [scriptblock]$Cmd) {
    $out = & $Cmd 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) { Write-Host "OK   $Name"; return }
    $script:failed = $true
    Write-Host "FAIL $Name"
    $lines = $out -split "`r?`n"
    $hits = @($lines | Where-Object { $_ -match "error|fail|Assert|Expected|Actual|Exception" })
    if ($hits.Count -eq 0) { $hits = $lines }
    $hits | Select-Object -First $MaxLines | ForEach-Object { Write-Host "  $_" }
    if ($hits.Count -gt $MaxLines) { Write-Host "  ... ($($hits.Count - $MaxLines) more lines)" }
}

$proj = "tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj"
if ($Full) {
    Invoke-Step "dotnet test (all)" { dotnet test $proj -c Release --nologo -v q }
    $Build = $true
} elseif ($Tests.Count -gt 0) {
    $filter = ($Tests | ForEach-Object { "FullyQualifiedName~$_" }) -join "|"
    Invoke-Step "dotnet test ($($Tests -join ', '))" { dotnet test $proj -c Release --nologo -v q --filter $filter }
}
if ($Build) {
    Invoke-Step "dotnet build src/Cuy" { dotnet build src/Cuy/Cuy.csproj -c Release --nologo -v q -p:EnableWindowsTargeting=true }
}
foreach ($f in $Js) { Invoke-Step "node --check $f" { node --check $f } }
if ($Smoke) { Invoke-Step "web smoke" { node tools/qa/web-smoke.js } }

if ($script:failed) { exit 1 } else { Write-Host "ALL OK"; exit 0 }
