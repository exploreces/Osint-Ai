@echo off
echo ========================================
echo   SpectralINT - Starting Backend
echo ========================================
echo.

cd /d "%~dp0backend"

echo Checking if backend is already running...
curl -s http://localhost:8080/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend is already running on port 8080!
    echo.
    pause
    exit /b
)

echo Starting Spring Boot backend...
echo Please wait, this may take 30-60 seconds...
echo.

start "SpectralINT Backend" mvn spring-boot:run

echo.
echo Waiting for backend to start...
timeout /t 10 /nobreak >nul

:CHECK_LOOP
curl -s http://localhost:8080/api/v1/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting...
    timeout /t 3 /nobreak >nul
    goto CHECK_LOOP
)

echo.
echo ========================================
echo   Backend Started Successfully!
echo   Running on: http://localhost:8080
echo ========================================
echo.
echo Press any key to start the frontend...
pause >nul

cd /d "%~dp0frontend"

echo.
echo ========================================
echo   Starting Frontend (React)
echo ========================================
echo.

start "SpectralINT Frontend" npm start

echo.
echo ========================================
echo   SpectralINT is starting!
echo   Backend:  http://localhost:8080
echo   Frontend: http://localhost:3000
echo   (Browser will open automatically)
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
