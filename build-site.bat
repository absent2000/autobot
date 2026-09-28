@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 22 LTS once, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing site dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Production build ready: %~dp0dist\
start "" "%~dp0dist"
pause
