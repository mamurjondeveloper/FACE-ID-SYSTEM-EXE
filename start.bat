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

if not exist "models" (
  mkdir models
)

if not exist "public\models" (
  mkdir public\models
)

echo Running first-run setup...
call node scripts\firstRunSetup.js
if errorlevel 1 (
  echo Setup failed. Face model files could not be prepared.
  pause
  exit /b 1
)

echo Starting SmartAttendance...
set SMARTATTENDANCE_LOCAL=1
call npm run start:local
