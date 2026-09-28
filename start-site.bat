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
  echo First launch: installing site dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4321"
echo Cars24 local site: http://localhost:4321
call npm run dev -- --host 127.0.0.1
