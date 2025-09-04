@echo off
setlocal enabledelayedexpansion
title K6 Load Test Runner

:: Function to load .env file
:loadenv
if not exist ".env" (
    echo ⚠️ No .env file found in current directory!
    goto :eof
)
echo Loading environment variables from .env...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" (
        if not "%%a"=="#" (
            set "%%a=%%b"
        )
    )
)
:: Map Grafana token if present
if defined GRAFANA_CLOUD_POS_TOKEN (
    set K6_CLOUD_TOKEN=!GRAFANA_CLOUD_POS_TOKEN!
)
goto :eof

:menu
cls
echo ================================
echo       K6 Load Test Runner
echo ================================
echo.
echo 1. Run standard load test (with Grafana Cloud)
echo 2. Run smoke test (1 user, 30s) (with Grafana Cloud)
echo 3. Run stress test (50 users, 2m) (with Grafana Cloud)
echo 4. Run local only (no cloud reporting)
echo 5. Show environment variables
echo 6. Exit
echo.
set /p choice="Select an option (1-6): "

if "%choice%"=="1" goto runstandard
if "%choice%"=="2" goto runsmoke
if "%choice%"=="3" goto runstress
if "%choice%"=="4" goto runlocal
if "%choice%"=="5" goto showenv
if "%choice%"=="6" exit /b 0
goto menu

:runstandard
call :loadenv
echo Running standard load test with Grafana Cloud...
echo ================================
k6 run --out cloud loadtest.js
goto end

:runsmoke
call :loadenv
echo Running smoke test with Grafana Cloud...
echo ================================
k6 run --out cloud --vus 1 --duration 30s loadtest.js
goto end

:runstress
call :loadenv
echo Running stress test with Grafana Cloud...
echo ================================
k6 run --out cloud --vus 50 --duration 2m loadtest.js
goto end

:runlocal
call :loadenv
echo Running tests locally (no cloud reporting)...
echo ================================
echo.
echo 1. Standard load test
echo 2. Smoke test
echo 3. Stress test
echo.
set /p localchoice="Select local test (1-3): "

if "%localchoice%"=="1" (
    k6 run loadtest.js
) else if "%localchoice%"=="2" (
    k6 run --vus 1 --duration 30s loadtest.js
) else if "%localchoice%"=="3" (
    k6 run --vus 50 --duration 2m loadtest.js
) else (
    echo Invalid choice, running standard test...
    k6 run loadtest.js
)
goto end

:showenv
call :loadenv
echo Current environment variables:
echo ================================
echo API_TOKEN=!API_TOKEN!
echo BASE_URL=!BASE_URL!
echo GRAFANA_CLOUD_POS_TOKEN=!GRAFANA_CLOUD_POS_TOKEN!
echo K6_CLOUD_TOKEN=!K6_CLOUD_TOKEN!
echo.
echo Grafana Cloud Authentication Status:
if exist "%USERPROFILE%\AppData\Roaming\k6\config.json" (
    echo ✓ k6 is authenticated with Grafana Cloud
) else (
    echo ✗ k6 is NOT authenticated with Grafana Cloud
    echo   Run: k6 cloud login
)
echo.
pause
goto menu

:end
echo.
echo ================================
echo Test completed!
echo.
echo If you ran a cloud test, check your Grafana Cloud dashboard at:
echo https://your-org.grafana.net/a/k6-app/runs
echo.
pause
goto menu
