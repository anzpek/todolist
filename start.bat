@echo off
title TodoList Development Server (Debug Mode)
echo ==========================================
echo     TodoList React App - Debug Mode
echo ==========================================
echo.

echo [1/4] Checking Node.js availability...
node -v
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found! Please install Node.js.
    pause
    exit /b
)

echo.
echo [2/4] Checking NPM availability...
call npm -v
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not found!
    pause
    exit /b
)

echo.
echo [3/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

echo.
echo [4/4] Starting Development Server...
echo If this closes immediately, there is an error in the application.
echo.
call npx vite --port 4000
if %errorlevel% neq 0 (
    echo [ERROR] Server crashed or failed to start.
)

echo.
echo ==========================================
echo Server stopped. Press any key to exit...
echo ==========================================
pause >nul