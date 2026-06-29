@echo off
title WhatsFlow - Demarrage
color 0A
cls

echo.
echo  ================================================
echo   WHATSFLOW - DEMARRAGE AUTOMATIQUE
echo  ================================================
echo.

:: ── ETAPE 1 : Git PATH ─────────────────────────────
echo [1/4] Configuration Git...
set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd
echo OK

:: ── ETAPE 2 : Docker ───────────────────────────────
echo [2/4] Demarrage des conteneurs Docker...
docker start whatsflow_postgres whatsflow_redis

echo Attente PostgreSQL...
:WAIT_POSTGRES
docker exec whatsflow_postgres pg_isready -U whatsflow -d whatsflow >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto WAIT_POSTGRES
)
echo PostgreSQL pret !

:: ── ETAPE 3 : FastAPI EN PREMIER ───────────────────
echo [3/4] Demarrage de l'API FastAPI...
start "WhatsFlow - API FastAPI" cmd /k "cd /d "C:\Users\Studio D\Desktop\DASHBOARD SWIFT AI\whatsflow" && py -3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Attente de FastAPI...
:WAIT_FASTAPI
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 goto WAIT_FASTAPI
echo FastAPI pret !

:: ── ETAPE 4 : Bridge Baileys APRES FastAPI ─────────
echo [4/4] Demarrage du pont Baileys...
start "WhatsFlow - Bridge Baileys" cmd /k "cd /d "C:\Users\Studio D\Desktop\DASHBOARD SWIFT AI\whatsflow\whatsapp-engine" && set PATH=%PATH%;C:\Program Files\Git\bin && node bridge.js"

echo Attente du bridge...
:WAIT_BRIDGE
timeout /t 2 /nobreak >nul
curl -s http://localhost:3010/health >nul 2>&1
if errorlevel 1 goto WAIT_BRIDGE
echo Bridge pret !

:: ── TOUT EST PRET ───────────────────────────────────
cls
echo.
echo  ================================================
echo   WHATSFLOW EST OPERATIONNEL !
echo  ================================================
echo.
echo   API FastAPI   : http://localhost:8000
echo   Documentation : http://localhost:8000/docs
echo   Bridge Baileys: http://localhost:3010
echo.
echo   Sessions actives :
curl -s http://localhost:3010/health
echo.
echo  ================================================
echo   Appuie sur une touche pour fermer
echo  ================================================
echo.
pause