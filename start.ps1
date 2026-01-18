# Quick Start Script for Workless, be sir
# PowerShell version

Write-Host "====================================" -ForegroundColor Cyan
Write-Host " Workless, be sir - Quick Start" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "[ERROR] .env.local file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create .env.local file with:" -ForegroundColor Yellow
    Write-Host "OPENAI_API_KEY=your_api_key_here" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/3] Checking dependencies..." -ForegroundColor Green
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✓ Dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Environment check..." -ForegroundColor Green
Write-Host "✓ .env.local found" -ForegroundColor Green
Write-Host "✓ Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Starting development server..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will start at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev
