@echo off
echo ========================================
echo   ChatDock AI - Frontend Setup & Start
echo ========================================
echo.
echo [1/2] Installing npm dependencies...
call npm install
echo.
echo [2/2] Starting React frontend on port 5173...
npm run dev
