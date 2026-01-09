@echo off
title SignatureForge - Stop

echo Stopping SignatureForge servers...
echo.

:: Kill Python/uvicorn processes
echo Stopping backend server...
taskkill /F /IM python.exe 2>nul
if %errorlevel%==0 (
    echo   Backend stopped.
) else (
    echo   Backend was not running.
)

:: Kill Node processes
echo Stopping frontend server...
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo   Frontend stopped.
) else (
    echo   Frontend was not running.
)

echo.
echo SignatureForge servers stopped.
timeout /t 2 >nul
