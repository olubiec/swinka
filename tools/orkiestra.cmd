@echo off
setlocal
python -m orkiestra %*
exit /b %ERRORLEVEL%
