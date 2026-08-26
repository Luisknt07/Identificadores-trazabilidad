@echo off
setlocal
cd /d "%~dp0"
title LogiTrace - Servidor local

where py >nul 2>nul
if %errorlevel%==0 goto use_py

where python >nul 2>nul
if %errorlevel%==0 goto use_python

echo No se encontro Python en este equipo.
echo Instala Python o publica esta carpeta en un servidor web.
pause
exit /b 1

:use_py
py serve_logitrace.py
goto end

:use_python
python serve_logitrace.py

:end
endlocal
