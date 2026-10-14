# Builds Cuy.sln with Visual Studio MSBuild (restores packages.config) and runs the Core tests.
param([string]$Config = "Debug", [switch]$NoTests)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vswhere)) { Write-Error "vswhere not found: install Visual Studio 2022 with .NET desktop development" }
$msbuild = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -find "MSBuild\**\Bin\MSBuild.exe" | Select-Object -First 1
if (-not $msbuild) { Write-Error "MSBuild not found" }
& $msbuild "$root\Cuy.sln" /restore /p:RestorePackagesConfig=true /p:Configuration=$Config /m /v:minimal /nologo
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED"; exit $LASTEXITCODE }
Write-Host "BUILD OK ($Config)"
if (-not $NoTests) {
    dotnet test "$root\tests\Cuy.Core.Tests\Cuy.Core.Tests.csproj" -c $Config --nologo -v q
    if ($LASTEXITCODE -ne 0) { Write-Host "TESTS FAILED"; exit $LASTEXITCODE }
    Write-Host "TESTS OK"
}
