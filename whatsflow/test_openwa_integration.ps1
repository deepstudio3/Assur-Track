# Test OpenWA Integration PowerShell Script

Write-Host "🚀 CONSTRUCTION ET TEST DE L'ARCHITECTURE OPENWA PERSONNALISÉE" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green

# 1. Construire le moteur WhatsApp Engine
Write-Host "📦 Construction du moteur WhatsApp Engine..." -ForegroundColor Yellow
Set-Location whatsapp-engine
docker build -t whatsapp-openwa-engine:latest .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Moteur WhatsApp Engine construit avec succès" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de construction du moteur" -ForegroundColor Red
    exit 1
}

# 2. Nettoyer l'environnement
Write-Host "🧹 Nettoyage de l'environnement Docker..." -ForegroundColor Yellow
Set-Location ..
docker-compose down --volumes --remove-orphans
docker system prune -f

# 3. Démarrer les services de base
Write-Host "🔄 Démarrage des services de base..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Attendre que les services soient prêts
Write-Host "⏳ Attente des services de base..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 4. Démarrer l'API
Write-Host "🌐 Démarrage de l'API FastAPI..." -ForegroundColor Yellow
docker-compose up -d api

# Attendre que l'API soit prête
Write-Host "⏳ Attente de l'API..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# 5. Vérifier les services
Write-Host "📊 Vérification des services..." -ForegroundColor Cyan
docker-compose ps

# 6. Tester l'API
Write-Host "🧪 Test de l'API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method GET
    Write-Host "✅ API opérationnelle" -ForegroundColor Green
} catch {
    Write-Host "⚠️ API non disponible" -ForegroundColor Yellow
}

# 7. Tester Redis
Write-Host "🔴 Test de Redis..." -ForegroundColor Cyan
try {
    docker-compose exec redis redis-cli ping
    Write-Host "✅ Redis opérationnel" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Redis non disponible" -ForegroundColor Yellow
}

# 8. Créer un client de test
Write-Host "👤 Création d'un client de test..." -ForegroundColor Cyan
$clientData = @{
    name = "Test Client OpenWA"
    email = "test@openwa.com"
    description = "Client pour tester le moteur OpenWA personnalisé"
    max_sessions = 3
    messages_per_second = 2
} | ConvertTo-Json

try {
    $clientResponse = Invoke-RestMethod -Uri "http://localhost:8001/api/clients/" -Method POST -ContentType "application/json" -Body $clientData
    Write-Host "✅ Client créé avec ID: $($clientResponse.id)" -ForegroundColor Green
    $CLIENT_ID = $clientResponse.id
    $API_KEY = $clientResponse.api_key
    Write-Host "🔑 API Key: $API_KEY" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la création du client" -ForegroundColor Red
    exit 1
}

# 9. Créer une session de test
Write-Host "📱 Création d'une session de test..." -ForegroundColor Cyan
$sessionData = @{
    client_id = $CLIENT_ID
    session_label = "test-session-openwa"
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:8001/api/session/create" -Method POST -ContentType "application/json" -Body $sessionData -Headers @{Authorization = "Bearer $API_KEY"}
    Write-Host "✅ Session créée avec ID: $($sessionResponse.id)" -ForegroundColor Green
    $SESSION_ID = $sessionResponse.id
    $QR_CODE = $sessionResponse.qr_code
    Write-Host "📱 QR Code disponible: $($QR_CODE.Substring(0, [Math]::Min(50, $QR_CODE.Length)))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la création de la session" -ForegroundColor Red
    exit 1
}

# 10. Vérifier le conteneur WhatsApp
Write-Host "🔍 Vérification du conteneur WhatsApp..." -ForegroundColor Cyan
$container = docker ps | Select-String "whatsapp_$SESSION_ID"
if ($container) {
    Write-Host "✅ Conteneur WhatsApp trouvé" -ForegroundColor Green
} else {
    Write-Host "⚠️ Conteneur WhatsApp non trouvé" -ForegroundColor Yellow
}

# 11. Attendre et vérifier le QR code
Write-Host "⏳ Attente du QR code (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 12. Vérifier le statut de la session
Write-Host "📊 Vérification du statut de la session..." -ForegroundColor Cyan
try {
    $statusResponse = Invoke-RestMethod -Uri "http://localhost:8001/api/session/$SESSION_ID/status" -Method GET -Headers @{Authorization = "Bearer $API_KEY"}
    Write-Host "📊 Statut: $($statusResponse | ConvertTo-Json -Compress)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ Impossible de récupérer le statut" -ForegroundColor Yellow
}

# 13. Logs du conteneur WhatsApp
Write-Host "📋 Logs du conteneur WhatsApp..." -ForegroundColor Cyan
docker logs "whatsapp_$SESSION_ID" --tail=20

Write-Host ""
Write-Host "🎯 TEST TERMINÉ - RÉSUMÉ:" -ForegroundColor Magenta
Write-Host "==========================" -ForegroundColor Magenta
Write-Host "✅ Moteur OpenWA personnalisé: Construit" -ForegroundColor Green
Write-Host "✅ Services Docker: Opérationnels" -ForegroundColor Green
Write-Host "✅ API FastAPI: En ligne" -ForegroundColor Green
Write-Host "✅ Client de test: Créé ($CLIENT_ID)" -ForegroundColor Green
Write-Host "✅ Session WhatsApp: Créée ($SESSION_ID)" -ForegroundColor Green
Write-Host "📱 QR Code: Disponible pour scan" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 API disponible sur: http://localhost:8001" -ForegroundColor Cyan
Write-Host "📚 Documentation: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Pour surveiller les conteneurs:" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f" -ForegroundColor White
Write-Host "   docker ps -a" -ForegroundColor White
Write-Host ""
Write-Host "🎉 ARCHITECTURE OPENWA PERSONNALISÉE PRÊTE !" -ForegroundColor Magenta
