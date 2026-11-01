@echo off
setlocal
title Cuy Desktop Pet - Instalator / Installer

echo =======================================================
echo          CUY - Pixel Art Guinea Pig Desktop Pet
echo                   Instalator / Installer
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\Programs\Cuy"
set "CURR_DIR=%~dp0"
if "%CURR_DIR:~-1%"=="\" set "CURR_DIR=%CURR_DIR:~0,-1%"

echo [1/4] Przygotowywanie folderu docelowego:
echo       %TARGET_DIR%
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo.
echo [2/4] Pobieranie / Instalowanie plikow gry...

if exist "%CURR_DIR%\Cuy.exe" (
    echo [LOKALNIE] Kopiowanie plikow z biezacego folderu...
    robocopy "%CURR_DIR%" "%TARGET_DIR%" /E /XF *.pdb *.xml /XD logs /NFL /NDL /NJH /NJS /NP
) else if exist "%CURR_DIR%\Cuy_v1.zip" (
    echo [LOKALNIE] Rozpakowywanie archiwum Cuy_v1.zip...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%CURR_DIR%\Cuy_v1.zip' -DestinationPath '%TARGET_DIR%' -Force; if(Test-Path '%TARGET_DIR%\Cuy_v1\Cuy.exe'){ Get-ChildItem '%TARGET_DIR%\Cuy_v1\*' | Move-Item -Destination '%TARGET_DIR%' -Force; Remove-Item '%TARGET_DIR%\Cuy_v1' -Recurse -Force }"
) else if exist "%CURR_DIR%\..\dist\Cuy_v1.zip" (
    echo [REPO] Rozpakowywanie archiwum dist/Cuy_v1.zip...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%CURR_DIR%\..\dist\Cuy_v1.zip' -DestinationPath '%TARGET_DIR%' -Force; if(Test-Path '%TARGET_DIR%\Cuy_v1\Cuy.exe'){ Get-ChildItem '%TARGET_DIR%\Cuy_v1\*' | Move-Item -Destination '%TARGET_DIR%' -Force; Remove-Item '%TARGET_DIR%\Cuy_v1' -Recurse -Force }"
) else (
    echo [INTERNET] Pobieranie oficjalnej paczki z GitHub Releases...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $tmpZip = Join-Path $env:TEMP 'Cuy_Setup.zip'; try { (New-Object System.Net.WebClient).DownloadFile('https://github.com/olubiec/swinka/releases/download/v1.0.0/Cuy_v1.zip', $tmpZip); Write-Host 'Rozpakowywanie archiwum...'; Expand-Archive -Path $tmpZip -DestinationPath '%TARGET_DIR%' -Force; if(Test-Path '%TARGET_DIR%\Cuy_v1\Cuy.exe'){ Get-ChildItem '%TARGET_DIR%\Cuy_v1\*' | Move-Item -Destination '%TARGET_DIR%' -Force; Remove-Item '%TARGET_DIR%\Cuy_v1' -Recurse -Force }; Remove-Item $tmpZip -Force; Write-Host 'Pobieranie zakonczone pomyslnie!' } catch { Write-Host 'Blad pobierania: ' $_.Exception.Message }"
)

echo.
echo [3/4] Tworzenie skrotow...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $dPath = [System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Cuy.lnk'); $s = $ws.CreateShortcut($dPath); $s.TargetPath = '%TARGET_DIR%\Cuy.exe'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Description = 'Cuy Guinea Pig Desktop Pet'; $s.Save(); $smPath = [System.IO.Path]::Combine([Environment]::GetFolderPath('Programs'), 'Cuy.lnk'); $s2 = $ws.CreateShortcut($smPath); $s2.TargetPath = '%TARGET_DIR%\Cuy.exe'; $s2.WorkingDirectory = '%TARGET_DIR%'; $s2.Description = 'Cuy Guinea Pig Desktop Pet'; $s2.Save()"

echo.
echo [4/4] Weryfikacja instalacji...
if exist "%TARGET_DIR%\Cuy.exe" (
    echo =======================================================
    echo   SUKCES: Cuy zostal pomyslnie zainstalowany!
    echo.
    echo   Lokalizacja: %TARGET_DIR%
    echo   Skrot zostal umieszczony na Pulpicie i w Menu Start.
    echo.
    echo   Auto-Updater: WLACZONY
    echo   Cuy automatycznie sprawdza nowe wersje w tle
    echo   i aktualizuje sie bez utraty Twoich zapisow!
    echo =======================================================
    echo.
    echo Uruchamianie gry Cuy...
    start "" "%TARGET_DIR%\Cuy.exe"
) else (
    echo =======================================================
    echo   [BLAD] Nie znaleziono pliku Cuy.exe w folderze docelowym.
    echo   Upewnij sie, ze posiadasz polaczenie z internetem
    echo   lub uruchom Cuy-Installer.cmd w folderze z Cuy_v1.zip.
    echo =======================================================
    pause
)

endlocal
