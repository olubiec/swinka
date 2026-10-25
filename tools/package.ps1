# Builds the Release version, self-tests it and packs dist/Cuy_v1.zip (the folder to give away).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$out = Join-Path $dist "Cuy_v1"
$release = Join-Path $root "src\Cuy\bin\Release"

& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build.ps1") -Config Release
if ($LASTEXITCODE -ne 0) { Write-Host "PACKAGE STOPPED: build failed"; exit $LASTEXITCODE }

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null

# Copy the build without symbols, xml docs, config backups and logs.
robocopy $release $out /E /XF *.pdb *.xml *.config.bak /XD logs /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Host "PACKAGE STOPPED: copy failed"; exit 1 }

# WebView2Loader.dll is in runtimes\win-x64\native\ etc., but WebView2 package on .NET Framework expects it next to the exe or in runtimes folder.
# The SDK style project puts runtimes/ folder in bin/Release, so it gets copied by robocopy.

# assets/ and web/ must be inside.
foreach ($name in "assets", "web") {
    if (-not (Test-Path (Join-Path $out $name))) {
        Copy-Item (Join-Path $root $name) (Join-Path $out $name) -Recurse
    }
}

Copy-Item (Join-Path $PSScriptRoot "package\README.txt") $out
Copy-Item (Join-Path $root "THIRD_PARTY_NOTICES.md") $out

# Self-test the packed copy.
$selftestFile = Join-Path $env:TEMP "cuy-selftest.txt"
if (Test-Path $selftestFile) { Remove-Item $selftestFile }
$proc = Start-Process -FilePath (Join-Path $out "Cuy.exe") -ArgumentList "--selftest" -Wait -PassThru
if (Test-Path $selftestFile) { Get-Content $selftestFile | Write-Host }
if ($proc.ExitCode -eq 1) { Write-Host "PACKAGE STOPPED: self-test failed"; exit 1 }

$zip = Join-Path $dist "Cuy_v1.zip"
Compress-Archive -Path $out -DestinationPath $zip
Write-Host ("ZIP OK: {0} ({1:N1} MB)" -f $zip, ((Get-Item $zip).Length / 1MB))
