@echo off
title SignatureForge

echo Starting SignatureForge...
echo.

:: Start backend server
echo [1/2] Starting backend server on port 8000...
start "SignatureForge Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to initialize
timeout /t 2 /nobreak >nul

:: Start frontend dev server
echo [2/2] Starting frontend dev server on port 5173...
start "SignatureForge Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo SignatureForge is starting...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
echo Close this window or press any key to exit (servers will keep running).
pause >nul
