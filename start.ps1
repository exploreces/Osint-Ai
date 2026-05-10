# SpectralINT Application Launcher
# This script starts both backend and frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SpectralINT - Multi-Agent OSINT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if backend is already running
Write-Host "Checking if backend is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is already running on port 8080!" -ForegroundColor Green
        $skipBackend = $true
    }
} catch {
    Write-Host "Backend is not running. Will start it..." -ForegroundColor Yellow
    $skipBackend = $false
}

Write-Host ""

# Start Backend
if (-not $skipBackend) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Starting Spring Boot Backend" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    Set-Location "$rootPath\backend"

    # Check if Maven is available
    $mavenExists = $null -ne (Get-Command mvn -ErrorAction SilentlyContinue)

    if ($mavenExists) {
        Write-Host "Starting backend with Maven..." -ForegroundColor Green
        Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rootPath\backend'; mvn spring-boot:run"

        Write-Host ""
        Write-Host "Waiting for backend to start (this may take 30-60 seconds)..." -ForegroundColor Yellow

        $maxAttempts = 60
        $attempt = 0
        $started = $false

        while ($attempt -lt $maxAttempts -and -not $started) {
            Start-Sleep -Seconds 2
            $attempt++

            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $started = $true
                }
            } catch {
                Write-Host "." -NoNewline
            }
        }

        Write-Host ""
        if ($started) {
            Write-Host "✓ Backend started successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Backend may still be starting. Please check the backend window." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Maven not found in PATH!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start the backend manually:" -ForegroundColor Yellow
        Write-Host "  1. Open IntelliJ IDEA" -ForegroundColor White
        Write-Host "  2. Open the 'backend' folder" -ForegroundColor White
        Write-Host "  3. Right-click SpectralIntApplication.java" -ForegroundColor White
        Write-Host "  4. Select 'Run SpectralIntApplication'" -ForegroundColor White
        Write-Host ""
        Write-Host "Press any key when backend is running..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
} else {
    Write-Host "Skipping backend startup (already running)" -ForegroundColor Green
}

Write-Host ""

# Start Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting React Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$rootPath\frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first time only)..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rootPath\frontend'; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   SpectralINT is starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8080" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000 (will open in browser)" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
