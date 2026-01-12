@echo off
cd /d %~dp0
call npm install
call npm run tauri build
pause
