@echo off
title TodoList Development Server
echo ==========================================
echo     TodoList React App - Dev Server
echo ==========================================
echo.
echo Starting development server on port 4000...
echo.

npm run dev -- --port 4000

echo.
echo Server stopped. Press any key to exit...
pause >nul