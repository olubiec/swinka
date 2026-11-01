@echo off
setlocal

if "%~1"=="" goto usage
if "%~2"=="" goto usage
if "%~3"=="" goto usage

:: Wait for process to exit
powershell -NoProfile -Command "while(Get-Process -Id %1 -ErrorAction SilentlyContinue){ Start-Sleep -Milliseconds 200 }"

:: Archive extraction
powershell -NoProfile -Command "Expand-Archive -Path '%~2' -DestinationPath '%~3' -Force; if(Test-Path '%~3\Cuy_v1\Cuy.exe'){ Get-ChildItem '%~3\Cuy_v1\*' | Move-Item -Destination '%~3' -Force; Remove-Item '%~3\Cuy_v1' -Recurse -Force }"

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
