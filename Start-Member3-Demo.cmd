@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Ask your coding teammate to install the team's Node.js version.
  pause
  exit /b 1
)
node demo-server.cjs
pause
