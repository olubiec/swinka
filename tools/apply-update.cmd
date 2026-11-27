@echo off
setlocal

if "%~1"=="" goto usage
if "%~2"=="" goto usage
if "%~3"=="" goto usage

:: Wait for process to exit (max 30 seconds)
powershell -NoProfile -Command "$i=0; while((Get-Process -Id %1 -ErrorAction SilentlyContinue) -and ($i -lt 150)){ Start-Sleep -Milliseconds 200; $i++ }"

:: Extract to staging folder and copy over target dir
set "STAGE=%TEMP%\CuyUpdate\extracted"
if exist "%STAGE%" rmdir /s /q "%STAGE%" 2>nul
powershell -NoProfile -Command "$stage='%STAGE%'; New-Item -ItemType Directory -Force -Path $stage | Out-Null; Expand-Archive -Path '%~2' -DestinationPath $stage -Force; $src=$stage; $subs=Get-ChildItem -Path $stage -Directory; if($subs.Count -eq 1 -and -not (Test-Path (Join-Path $stage 'Cuy.exe')) -and (Test-Path (Join-Path $subs[0].FullName 'Cuy.exe'))){ $src=$subs[0].FullName }; Copy-Item -Path (Join-Path $src '*') -Destination '%~3' -Recurse -Force"

:: Create or update Desktop shortcut
powershell -NoProfile -Command "try { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Cuy.lnk')); $s.TargetPath = '%~3\Cuy.exe'; $s.WorkingDirectory = '%~3'; $s.IconLocation = '%~3\Cuy.exe,0'; $s.Save() } catch {}"

:: Cleanup: deletes %~2 or temp directory
if exist "%~2" del /f /q "%~2" 2>nul
if exist "%TEMP%\CuyUpdate" rmdir /s /q "%TEMP%\CuyUpdate" 2>nul

:: Relaunch
start "" "%~3\Cuy.exe"

goto eof

:usage
echo Usage: apply-update.cmd ^<pid^> ^<zip-path^> ^<target-dir^>
exit /b 1

:eof
endlocal
