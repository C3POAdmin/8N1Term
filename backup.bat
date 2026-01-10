@echo off
setlocal

REM timestamp: YYYYMMDD-HHMM
for /f "tokens=1-4 delims=/:. " %%a in ("%date% %time%") do (
  set TS=%%d%%b%%c-%%a%%e
)

set OUT=tauri-source-backup-%TS%.zip

git archive --format=zip HEAD -o %OUT%

if errorlevel 1 (
  echo Backup failed.
  exit /b 1
)

echo Backup created: %OUT%
