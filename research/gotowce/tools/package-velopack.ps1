# Optional installer + auto-update with Velopack (https://docs.velopack.io), next to the existing ZIP (package.ps1).
# Produces dist/velopack/: Cuy-win-Setup.exe (per-user install, no admin), Cuy-win-Portable.zip, *.nupkg and releases.*.json.
# Setup.exe installs .NET Framework 4.8 and the WebView2 runtime first if they are missing (--framework net48,webview2).
# Upload everything from dist/velopack to a GitHub Release (vpk upload github ... or by hand); Updater.cs reads it.
#
# One-time setup on the build PC:  dotnet tool install -g vpk   (use the same version as the Velopack NuGet package)
# Usage:  powershell -ExecutionPolicy Bypass -File tools/package-velopack.ps1 -Version 1.2.0
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [string]$GitHubToken = ""    # only for "vpk upload github"; leave empty to upload by hand
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# 1. The normal package: Release build, self-test and dist/Cuy_v1 (folder) + zip.
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "package.ps1")
if ($LASTEXITCODE -ne 0) { Write-Host "VELOPACK STOPPED: package.ps1 failed"; exit $LASTEXITCODE }

$packDir = Join-Path $root "dist\Cuy_v1"
$outDir = Join-Path $root "dist\velopack"
if (-not (Test-Path (Join-Path $packDir "Cuy.exe"))) { Write-Host "VELOPACK STOPPED: dist\Cuy_v1\Cuy.exe missing"; exit 1 }
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }

# 2. Pack. --packId must never change after the first release (it is the install identity).
vpk pack `
    --packId "Cuy.DesktopPet" `
    --packVersion $Version `
    --packDir $packDir `
    --mainExe "Cuy.exe" `
    --packTitle "Cuy" `
    --packAuthors "Cuy" `
    --icon (Join-Path $root "src\Cuy\dotNet\icon.ico") `
    --framework "net48,webview2" `
    --outputDir $outDir
if ($LASTEXITCODE -ne 0) { Write-Host "VELOPACK STOPPED: vpk pack failed"; exit $LASTEXITCODE }

# 3. Optional upload to GitHub Releases of the repo used by Updater.cs.
if ($GitHubToken -ne "") {
    vpk upload github --repoUrl "https://github.com/olubiec/swinka" --token $GitHubToken `
        --outputDir $outDir --tag "v$Version" --releaseName "Cuy $Version" --publish
    if ($LASTEXITCODE -ne 0) { Write-Host "VELOPACK STOPPED: upload failed"; exit $LASTEXITCODE }
}

Get-ChildItem $outDir | ForEach-Object { Write-Host ("{0,-40} {1,8:N1} MB" -f $_.Name, ($_.Length / 1MB)) }
Write-Host "VELOPACK OK: $outDir"
