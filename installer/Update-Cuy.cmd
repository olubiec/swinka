@echo off
setlocal
title Cuy - Reczna Aktualizacja / Manual Update

echo =======================================================
echo          CUY - Aktualizacja / Update Tool
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\Programs\Cuy"
if not exist "%TARGET_DIR%\Cuy.exe" (
    if exist "%~dp0..\Cuy.exe" set "TARGET_DIR=%~dp0..\"
    if exist "%~dp0Cuy.exe" set "TARGET_DIR=%~dp0"
)

echo Cel aktualizacji: %TARGET_DIR%

echo.
echo Sprawdzanie najnowszej wersji na GitHub (olubiec/swinka)...
powershell -NoProfile -Command "
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;
    $rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/olubiec/swinka/releases/latest' -Headers @{'User-Agent'='Cuy-Updater'};
    Write-Host ('Najnowsza wersja online: ' + $rel.tag_name);
    $asset = $rel.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1;
    if ($asset) {
        $zipUrl = $asset.browser_download_url;
        Write-Host ('Pobieranie paczki z: ' + $zipUrl);
        $tempZip = Join-Path $env:TEMP 'CuyUpdate\update.zip';
        New-Item -ItemType Directory -Path (Split-Path $tempZip) -Force | Out-Null;
        Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip;
        Write-Host 'Wypakowywanie aktualizacji...';
        Expand-Archive -Path $tempZip -DestinationPath '%TARGET_DIR%' -Force;
        Remove-Item $tempZip -Force;
        Write-Host 'Aktualizacja zakonczona sukcesem!';
    } else {
        Write-Host 'Brak spakowanego archiwum w Release.';
    }
} catch {
    Write-Host ('Blad podczas pobierania aktualizacji: ' + $_.Exception.Message);
    if (Test-Path '%~dp0..\dist\Cuy_v1.zip') {
        Write-Host 'Uzywanie lokalnego archiwum dist/Cuy_v1.zip...';
        Expand-Archive -Path '%~dp0..\dist\Cuy_v1.zip' -DestinationPath '%TARGET_DIR%' -Force;
        Write-Host 'Zaktualizowano z pliku lokalnego!';
    }
}
"

echo.
echo =======================================================
echo Gotowe. Mozesz uruchomic Cuy.exe!
echo =======================================================
pause
endlocal
