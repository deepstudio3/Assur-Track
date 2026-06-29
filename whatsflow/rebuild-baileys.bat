@echo off
echo ============================================================
echo NETTOYAGE ET RECONSTRUCTION BAILEYS
echo ============================================================
echo.

echo [1/6] Arret des conteneurs WhatsApp...
for /f "tokens=1" %%i in ('docker ps -a ^| findstr whatsapp_') do (
    echo Arret de %%i
    docker stop %%i
    docker rm %%i
)
echo [OK] Conteneurs arretes
echo.

echo [2/6] Suppression de l'image Baileys...
docker rmi -f whatsapp-baileys-engine:latest
echo [OK] Image supprimee
echo.

echo [3/6] Nettoyage du cache Docker...
docker system prune -f
echo [OK] Cache nettoye
echo.

echo [4/6] Reconstruction de l'image (10-15 minutes)...
docker-compose build --no-cache whatsapp-engine
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec de la reconstruction
    pause
    exit /b 1
)
echo [OK] Image reconstruite
echo.

echo [5/6] Redemarrage des services...
docker-compose down
docker-compose up -d
echo [OK] Services redemarres
echo.

echo [6/6] Attente du demarrage...
timeout /t 10 /nobreak
echo.

echo ============================================================
echo TERMINE !
echo ============================================================
echo.
echo Prochaine etape : python test_session_simple.py
echo.
pause
