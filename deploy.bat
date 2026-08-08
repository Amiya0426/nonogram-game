@echo off
cd /d %~dp0
echo Starting one-click deploy: lint - build - upload - commit/push
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
echo.
pause
