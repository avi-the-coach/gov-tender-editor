@echo off
echo ============================================
echo   Gov Tender Editor
echo ============================================
echo.

:: ── Install dependencies if needed ──────────────────────────────────────────

if not exist "scraper-service\node_modules" (
    echo [Setup] Installing scraper-service dependencies...
    pushd scraper-service
    npm install
    popd
    echo.
)

if not exist "tender-editor\node_modules" (
    echo [Setup] Installing tender-editor dependencies...
    pushd tender-editor
    npm install
    popd
    echo.
)

:: ── Kill any previous instances on our ports ────────────────────────────────

for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    powershell -Command "if ((Get-Process -Id %%p -ErrorAction SilentlyContinue).ProcessName -eq 'node') { Stop-Process -Id %%p -Force }" 2>nul
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    powershell -Command "if ((Get-Process -Id %%p -ErrorAction SilentlyContinue).ProcessName -eq 'node') { Stop-Process -Id %%p -Force }" 2>nul
)

:: ── Start services ───────────────────────────────────────────────────────────

echo Starting services...
start "Scraper Service" /d "%CD%" cmd /k "node scraper-service\index.js"
start "Frontend (Vite)"  /d "%CD%\tender-editor" cmd /k "npm run dev"

:: ── Open browser ─────────────────────────────────────────────────────────────

echo Waiting for services to start...
timeout /t 5 /nobreak >nul

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist %CHROME% (
    start "" %CHROME% http://localhost:5173
) else (
    start http://localhost:5173
)

echo.
echo Services are running in two separate windows.
echo Close those windows to stop.
pause
