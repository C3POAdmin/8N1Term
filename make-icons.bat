@echo off
echo ==============================
echo Generating Tauri icons...
echo ==============================

npx tauri icon assets\icon.png

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Icon generation failed
    pause
    exit /b 1
)

echo.
echo ✅ Icons generated successfully
pause
