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

# assets/ and web/ must be inside.
foreach ($name in "assets", "web") {
    if (-not (Test-Path (Join-Path $out $name))) {
        Copy-Item (Join-Path $root $name) (Join-Path $out $name) -Recurse
    }
}

Copy-Item (Join-Path $PSScriptRoot "package\README.txt") $out
Copy-Item (Join-Path $root "THIRD_PARTY_NOTICES.md") $out

# Validation before zipping
$requiredItems = @(
    (Join-Path $out "assets\LICENSES"),
    (Join-Path $out "THIRD_PARTY_NOTICES.md"),
    (Join-Path $out "Cuy.exe"),
    (Join-Path $out "Newtonsoft.Json.dll"),
    (Join-Path $out "NAudio.dll"),
    (Join-Path $out "assets"),
    (Join-Path $out "web")
)
foreach ($req in $requiredItems) {
    if (-not (Test-Path $req)) {
        Write-Host "PACKAGE STOPPED: required item missing from package: $req"
        exit 1
    }
}

# Self-test the packed copy.
$selftestFile = Join-Path $env:TEMP "cuy-selftest.txt"
if (Test-Path $selftestFile) { Remove-Item $selftestFile }
$proc = Start-Process -FilePath (Join-Path $out "Cuy.exe") -ArgumentList "--selftest" -Wait -PassThru
if (Test-Path $selftestFile) { Get-Content $selftestFile | Write-Host }
if ($proc.ExitCode -eq 1) { Write-Host "PACKAGE STOPPED: self-test failed"; exit 1 }

$zip = Join-Path $dist "Cuy_v1.zip"
Compress-Archive -Path $out -DestinationPath $zip

# Check size
$zipLength = (Get-Item $zip).Length
$zipMB = $zipLength / 1MB
Write-Host ("ZIP OK: {0} ({1:N1} MB)" -f $zip, $zipMB)
if ($zipMB -gt 80) {
    Write-Host "PACKAGE STOPPED: zip larger than 80 MB"
    exit 1
}

# Inspect ZIP entries for forbidden paths and file extensions
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipArchive = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
    $forbiddenExtensions = @('.pdb', '.cs', '.csproj', '.sln')
    $forbiddenFolders = @('jules/', 'tools/', 'tests/', 'tasks/', 'docs/', 'research/')
    foreach ($entry in $zipArchive.Entries) {
        $fullName = $entry.FullName.Replace('\', '/')
        # Strip top-level package folder name if present
        if ($fullName -match '^[^/]+/(.*)$') {
            $inner = $matches[1]
        } else {
            $inner = $fullName
        }

        foreach ($ext in $forbiddenExtensions) {
            if ($inner.EndsWith($ext, [StringComparison]::OrdinalIgnoreCase)) {
                Write-Host "PACKAGE STOPPED: forbidden file in zip: $fullName"
                exit 1
            }
        }

        foreach ($folder in $forbiddenFolders) {
            if ($inner.StartsWith($folder, [StringComparison]::OrdinalIgnoreCase)) {
                Write-Host "PACKAGE STOPPED: forbidden directory in zip: $fullName"
                exit 1
            }
        }
    }
}
finally {
    $zipArchive.Dispose()
}
