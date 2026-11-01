@echo off
setlocal enabledelayedexpansion
title Cuy Desktop Pet - Instalator / Installer

echo =======================================================
echo          CUY - Pixel Art Guinea Pig Desktop Pet
echo                   Instalator / Installer
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\Programs\Cuy"
set "SOURCE_DIR=%~dp0..\"
if exist "%~dp0Cuy.exe" set "SOURCE_DIR=%~dp0"
if exist "%~dp0..\dist\Cuy_v1\Cuy.exe" set "SOURCE_DIR=%~dp0..\dist\Cuy_v1\"

echo [1/4] Przygotowywanie folderu instalacyjnego:
echo       %TARGET_DIR%
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [2/4] Kopiowanie plikow gry...
if exist "%~dp0Cuy_v1.zip" (
    echo Rozpakowywanie archiwum Cuy_v1.zip...
    powershell -NoProfile -Command "Expand-Archive -Path '%~dp0Cuy_v1.zip' -DestinationPath '%TARGET_DIR%' -Force"
) else if exist "%SOURCE_DIR%Cuy.exe" (
    robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /E /XF *.pdb *.xml /XD logs /NFL /NDL /NJH /NJS /NP
) else if exist "%~dp0..\dist\Cuy_v1.zip" (
    echo Rozpakowywanie archiwum Cuy_v1.zip...
    powershell -NoProfile -Command "Expand-Archive -Path '%~dp0..\dist\Cuy_v1.zip' -DestinationPath '%TARGET_DIR%' -Force"
) else (
    echo Sprawdzanie i pobieranie najnowszej paczki z GitHub Releases...
    powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $rel = Invoke-RestMethod 'https://api.github.com/repos/olubiec/swinka/releases/latest' -Headers @{'User-Agent'='Cuy-Installer'}; $asset = $rel.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1; if ($asset) { $t = Join-Path $env:TEMP 'Cuy_download.zip'; Invoke-WebRequest $asset.browser_download_url -OutFile $t; Expand-Archive $t '%TARGET_DIR%' -Force; Remove-Item $t -Force; Write-Host 'Pobrano i rozpakowano najnowsza wersje!' } } catch { Write-Host 'Brak polaczenia lub wydania online: ' $_.Exception.Message }"
    if not exist "%TARGET_DIR%\Cuy.exe" (
        echo Kopiowanie biezacych zasobow lokalnych...
        robocopy "%~dp0..\" "%TARGET_DIR%" Cuy.exe Newtonsoft.Json.dll NAudio.dll apply-update.cmd THIRD_PARTY_NOTICES.md /NFL /NDL /NJH /NJS /NP
        robocopy "%~dp0..\assets" "%TARGET_DIR%\assets" /E /NFL /NDL /NJH /NJS /NP
        robocopy "%~dp0..\web" "%TARGET_DIR%\web" /E /NFL /NDL /NJH /NJS /NP
    )
)

echo [3/4] Tworzenie skrotu na Pulpicie...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Cuy.lnk')); $s.TargetPath = '%TARGET_DIR%\Cuy.exe'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Description = 'Cuy Guinea Pig Desktop Pet'; $s.Save()"

echo [4/4] Weryfikacja instalacji...
if exist "%TARGET_DIR%\Cuy.exe" (
    echo.
    echo =======================================================
    echo   SUKCES: Cuy zostal pomyslnie zainstalowany!
    echo   Lokalizacja: %TARGET_DIR%
    echo   Skrot zostal umieszczony na Twoim Pulpicie.
    echo.
    echo   Auto-Updater: Aktywny. Cuy automatycznie sprawdza
    echo   i pobiera aktualizacje z GitHub Releases przy
    echo   polaczeniu z internetem bez utraty zapisanego stanu!
    echo =======================================================
    echo.
    set /p LAUNCH="Czy chcesz uruchomic Cuy teraz? (T/N) [Domyslnie: T]: "
    if /i "!LAUNCH!"=="" set "LAUNCH=T"
    if /i "!LAUNCH!"=="T" (
        start "" "%TARGET_DIR%\Cuy.exe"
    )
) else (
    echo [BLAD] Nie udalo sie zainstalowac Cuy.exe. Upewnij sie, ze uruchamiasz instalator jako wlasciciel konta.
    pause
)

endlocal
