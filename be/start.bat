@echo off
echo ========================================
echo   Camera AI - Starting All Services
echo ========================================
echo.

REM Get the directory where script is located
set SCRIPT_DIR=%~dp0

REM Start App Service
echo [1/2] Starting App Service (Port 8001)...
start "App Service" cmd /k "cd /d %SCRIPT_DIR%app && python main.py"
timeout /t 3 >nul

REM Start Gateway
echo [2/2] Starting Gateway (Port 9000)...
start "Gateway" cmd /k "cd /d %SCRIPT_DIR%gateway && python main.py"
timeout /t 2 >nul

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo   Gateway:     http://localhost:9000
echo   App Service: http://localhost:8001
echo   Gateway Docs: http://localhost:9000/docs
echo   App Docs:    http://localhost:8001/docs
echo.
echo Press any key to exit (services will keep running)...
pause >nul