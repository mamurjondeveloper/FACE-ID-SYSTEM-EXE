@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    exit /b 1
  )
)

echo Running setup sync...
call node scripts\firstRunSetup.js
if errorlevel 1 (
  echo Setup failed.
  exit /b 1
)

echo Building installer...
call npm run build:electron
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo Done. Installer is in release folder.
