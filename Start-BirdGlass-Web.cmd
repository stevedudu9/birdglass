@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the team's Node.js version first.
  pause
  exit /b 1
)
set PORT=5188
node demo-server.cjs
pause
