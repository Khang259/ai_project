@echo off
echo ========================================
echo Starting User-Controlled Pairs System
echo ========================================
echo.

echo [1/3] Starting API Handler on port 8001...
start "API Handler" cmd /k "python api_handler.py"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Stable Pair Processor...
start "Stable Pair Processor" cmd /k "cd logic && python stable_pair_processor.py"
timeout /t 2 /nobreak >nul

echo [3/3] Starting ROI Processor...
start "ROI Processor" cmd /k "python roi_processor.py"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Services running in separate windows:
echo - API Handler (port 8001)
echo - Stable Pair Processor
echo - ROI Processor
echo.
echo To test API:
echo   python test_api.py
echo.
echo To stop: Close the individual command windows
echo.
pause

