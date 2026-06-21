@echo off
setlocal

cd /d "%~dp0"

set "APP_PORT=8787"
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /I "%%A"=="PORT" set "APP_PORT=%%B"
  )
)
set "APP_URL=http://localhost:%APP_PORT%"

if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
  ) else (
    > ".env" echo OPENAI_API_KEY=sk-your-api-key-here
    >> ".env" echo PORT=8787
  )
  echo Created .env.
  echo Paste your OpenAI API key, save the file, then close Notepad.
  notepad ".env"
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  echo Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

echo Starting YaoTu...
echo Browser will open: %APP_URL%
echo Press Ctrl+C in this window to stop the server.

start "" cmd /c "timeout /t 2 /nobreak >nul & start %APP_URL%"

node server.js

echo.
echo Server stopped.
pause
