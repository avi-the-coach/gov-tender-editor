@echo off
echo ============================================
echo   Gov Tender Editor - Starting...
echo ============================================

:: Create logs dir
if not exist logs mkdir logs

:: Read port from config.json
for /f "tokens=*" %%a in ('node -e "try{console.log(require('./config.json').tenderEditor.port)}catch(e){console.log(5173)}"') do set PORT=%%a

:: Kill previous instances (only node.exe on our dev ports)
echo Checking for existing instances...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    powershell -Command "if ((Get-Process -Id %%p -ErrorAction SilentlyContinue).ProcessName -eq 'node') { Stop-Process -Id %%p -Force; Write-Host '[OK] Killed old scraper (PID %%p)' } else { Write-Host '[SKIP] Port 3001 used by non-node process - not killing' }"
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    powershell -Command "if ((Get-Process -Id %%p -ErrorAction SilentlyContinue).ProcessName -eq 'node') { Stop-Process -Id %%p -Force; Write-Host '[OK] Killed old frontend (PID %%p)' } else { Write-Host '[SKIP] Port %PORT% used by non-node process - not killing' }"
)
timeout /t 1 /nobreak >nul

:: Start backend in new window with logging
echo Starting scraper-service...
start "Scraper Service" powershell -ExecutionPolicy Bypass -NoExit -Command "Set-Location '%CD%'; Start-Transcript -Path '%CD%\logs\scraper.log' -Append; npm run dev:backend; Stop-Transcript"

:: Start frontend (Vite) in new window with logging
echo Starting frontend...
start "Frontend (Vite)" powershell -ExecutionPolicy Bypass -NoExit -Command "Set-Location '%CD%'; Start-Transcript -Path '%CD%\logs\frontend.log' -Append; npm run dev:frontend; Stop-Transcript"

:: Wait and open browser
echo Waiting for services to start...
timeout /t 5 /nobreak >nul
echo Opening browser at http://localhost:%PORT%
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% (
    start "" %CHROME_PATH% http://localhost:%PORT%
) else (
    echo Chrome not found, opening default browser...
    start http://localhost:%PORT%
)

echo.
echo Services running. Logs: logs\scraper.log and logs\frontend.log
echo Close the other windows to stop.
pause
