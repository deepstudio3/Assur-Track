# Script de démarrage de WhatsFlow pour Windows PowerShell

Write-Host "🚀 Démarrage de WhatsFlow..." -ForegroundColor Green
Write-Host ""

# Vérifier si .env existe
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Fichier .env non trouvé. Copie de .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Fichier .env créé. Veuillez le configurer avant de continuer." -ForegroundColor Green
    exit 1
}

# Démarrer les services Docker
Write-Host "🐳 Démarrage des conteneurs Docker..." -ForegroundColor Cyan
docker-compose up -d

Write-Host ""
Write-Host "⏳ Attente du démarrage des services (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Vérifier la santé de l'API
Write-Host ""
Write-Host "🔍 Vérification de l'API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Erreur lors de la vérification de l'API" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" -ForegroundColor Green
Write-Host "✅ WhatsFlow est démarré!" -ForegroundColor Green
Write-Host "=" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentation API: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🔍 Health Check: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour créer un client de test:" -ForegroundColor Yellow
Write-Host "  docker-compose exec api python scripts/create_test_client.py" -ForegroundColor White
Write-Host ""
