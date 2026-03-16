@echo off
echo ===================================================
echo   Installing AI Models (This may take a while)
echo ===================================================
echo.
echo 1. Pulling 'llama3.1' (Brain)...
"C:\Users\Piyush\AppData\Local\Programs\Ollama\ollama.exe" pull llama3.1
echo.
echo 2. Pulling 'nomic-embed-text' (Speed Reader)...
"C:\Users\Piyush\AppData\Local\Programs\Ollama\ollama.exe" pull nomic-embed-text
echo.
echo ===================================================
echo   Ollama Setup Complete!
echo ===================================================
pause
