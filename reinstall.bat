@echo off
cd /d %~dp0
echo Cleaning node_modules and package-lock.json...
rmdir /s /q node_modules 2>nul
rmdir /s /q tender-editor\node_modules 2>nul
del package-lock.json 2>nul

echo Installing dependencies (forced Windows platform)...
set npm_config_platform=win32
set npm_config_arch=x64
npm install

echo Removing any Linux rollup binaries...
rmdir /s /q node_modules\@rollup\rollup-linux-x64-gnu 2>nul
rmdir /s /q node_modules\@rollup\rollup-linux-x64-musl 2>nul
rmdir /s /q node_modules\@rollup\rollup-linux-arm64-gnu 2>nul
rmdir /s /q node_modules\@rollup\rollup-linux-arm64-musl 2>nul

echo Installing Windows rollup binary explicitly...
npm install @rollup/rollup-win32-x64-msvc

echo.
if exist node_modules\@rollup\rollup-win32-x64-msvc (
  echo [OK] rollup-win32-x64-msvc installed successfully
) else (
  echo [ERROR] Windows binary still missing - check npm version and platform
)

echo Done!
pause
