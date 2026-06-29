@echo off
title WhatsFlow - Arret
color 0C
cls

echo.
echo  ================================================
echo   WHATSFLOW - ARRET EN COURS...
echo  ================================================
echo.

echo Arret de FastAPI...
taskkill /f /fi "WINDOWTITLE eq WhatsFlow - API FastAPI*" >nul 2>&1

echo Arret du Bridge...
taskkill /f /fi "WINDOWTITLE eq WhatsFlow - Bridge Baileys*" >nul 2>&1

echo Arret des conteneurs Docker...
docker stop whatsflow_postgres whatsflow_redis

echo.
echo  ================================================
echo   WHATSFLOW ARRETE PROPREMENT
echo  ================================================
echo.
pause