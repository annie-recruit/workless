@echo off
echo ====================================
echo  Workless, be sir - Quick Start
echo ====================================
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo [ERROR] .env.local file not found!
    echo.
    echo Please create .env.local file with:
    echo OPENAI_API_KEY=your_api_key_here
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed.
)

echo.
echo [2/3] Environment check...
echo ✓ .env.local found
echo ✓ Dependencies installed

echo.
echo [3/3] Starting development server...
echo.
echo Server will start at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

call npm run dev
