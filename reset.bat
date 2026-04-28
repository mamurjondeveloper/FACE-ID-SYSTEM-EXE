@echo off
setlocal
cd /d "%~dp0"

echo Cleaning temp/cache files...
if exist "temp" (
  del /q "temp\*.*" 2>nul
)
if exist "dist" (
  rmdir /s /q dist
)

set /p KEEPDB="Keep local database? (Y/N): "
if /I "%KEEPDB%"=="Y" (
  echo Database kept.
) else (
  echo Database is stored in AppData\Roaming\SmartAttendance
  echo To remove it, uninstall app data manually from user profile.
)

echo Reset complete.
