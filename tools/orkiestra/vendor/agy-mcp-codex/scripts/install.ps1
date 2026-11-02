param(
    [string]$Name = "antigravity",
    [string]$AntigravityCliPath = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $repoRoot "server.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 18 or newer is required. Install Node.js, then run this script again."
}
if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw "Codex CLI was not found on PATH. Install or open Codex CLI, then run this script again."
}

$nodeVersion = [version]((& node --version).TrimStart("v"))
if ($nodeVersion.Major -lt 18) {
    throw "Node.js 18 or newer is required. Found $nodeVersion."
}

if (-not $AntigravityCliPath) {
    $agyCommand = Get-Command agy -ErrorAction SilentlyContinue
    if ($agyCommand) {
        $AntigravityCliPath = $agyCommand.Source
    } else {
        $defaultAgy = Join-Path $env:LOCALAPPDATA "agy\bin\agy.exe"
        if (Test-Path -LiteralPath $defaultAgy) {
            $AntigravityCliPath = $defaultAgy
        }
    }
}

if (-not $AntigravityCliPath -or -not (Test-Path -LiteralPath $AntigravityCliPath)) {
    throw "Antigravity CLI was not found. Install it first, or pass -AntigravityCliPath with its absolute path."
}

& codex mcp remove $Name 2>$null
& codex mcp add $Name --env "ANTIGRAVITY_CLI_PATH=$AntigravityCliPath" -- (Get-Command node).Source $serverPath
if ($LASTEXITCODE -ne 0) {
    throw "Codex failed to register the MCP server."
}

Write-Host "Registered MCP server '$Name'."
Write-Host "Restart Codex, then ask it to call antigravity_status."
