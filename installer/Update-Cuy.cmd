@echo off
setlocal
title Cuy - Reczna Aktualizacja / Manual Update

echo =======================================================
echo          CUY - Aktualizacja / Update Tool
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\Programs\Cuy"
if not exist "%TARGET_DIR%\Cuy.exe" (
    if exist "%~dp0..\Cuy.exe" set "TARGET_DIR=%~dp0.."
    if exist "%~dp0Cuy.exe" set "TARGET_DIR=%~dp0"
)
if "%TARGET_DIR:~-1%"=="\" set "TARGET_DIR=%TARGET_DIR:~0,-1%"

echo Cel aktualizacji: %TARGET_DIR%

echo.
echo Pobieranie najnowszej wersji z GitHub Releases...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $tmpZip = Join-Path $env:TEMP 'Cuy_Update.zip'; try { (New-Object System.Net.WebClient).DownloadFile('https://github.com/olubiec/swinka/releases/download/v1.0.0/Cuy_v1.zip', $tmpZip); Write-Host 'Wypakowywanie aktualizacji...'; Expand-Archive -Path $tmpZip -DestinationPath '%TARGET_DIR%' -Force; if(Test-Path '%TARGET_DIR%\Cuy_v1\Cuy.exe'){ Get-ChildItem '%TARGET_DIR%\Cuy_v1\*' | Move-Item -Destination '%TARGET_DIR%' -Force; Remove-Item '%TARGET_DIR%\Cuy_v1' -Recurse -Force }; Remove-Item $tmpZip -Force; Write-Host 'Aktualizacja zakonczona sukcesem!' } catch { Write-Host 'Blad podczas aktualizacji: ' $_.Exception.Message }"

echo.
echo =======================================================
echo Gotowe. Mozesz uruchomic Cuy.exe!
echo =======================================================
pause
endlocal
