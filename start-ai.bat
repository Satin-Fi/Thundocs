@echo off
echo Stopping existing Ollama...
taskkill /IM "ollama.exe" /F 2>nul
taskkill /IM "ollama app.exe" /F 2>nul
taskkill /IM "ollama_app.exe" /F 2>nul

echo.
echo Setting CORS permissions...
set OLLAMA_ORIGINS=*

echo.
echo Starting Ollama Server...
echo ---------------------------------------------------
echo NOTE: Please leave this window OPEN while using the AI.
echo ---------------------------------------------------
echo.

if exist "C:\Users\Piyush\AppData\Local\Programs\Ollama\ollama.exe" (
    "C:\Users\Piyush\AppData\Local\Programs\Ollama\ollama.exe" serve
) else (
    echo ERROR: Could not find Ollama at C:\Users\Piyush\AppData\Local\Programs\Ollama\ollama.exe
    echo Please ensure Ollama is installed.
    pause
)
pause
