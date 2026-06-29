# Restart Fresh PowerShell Script

Write-Host "🔄 Nettoyage complet de l'environnement Docker..." -ForegroundColor Green

# Arrêter et supprimer tous les conteneurs
docker-compose down --volumes --remove-orphans

# Supprimer les images non utilisées
docker image prune -f

# Supprimer les volumes (attention, cela efface les données)
docker volume prune -f

Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
Write-Host "🚀 Démarrage de la nouvelle configuration..." -ForegroundColor Green

# Démarrer avec la nouvelle configuration
docker-compose up --build -d

Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Vérifier les services
Write-Host "📊 État des services:" -ForegroundColor Cyan
docker-compose ps

Write-Host "🔍 Logs du service WhatsApp:" -ForegroundColor Cyan
docker-compose logs whatsapp-service --tail=20

Write-Host "🌐 API disponible sur: http://localhost:8001" -ForegroundColor Green
Write-Host "📱 WhatsApp API disponible sur: http://localhost:3000" -ForegroundColor Green
Write-Host "📚 Documentation Swagger: http://localhost:3000/api/docs" -ForegroundColor Green

Write-Host "🎯 Configuration terminée! Testez maintenant la création de sessions QR." -ForegroundColor Magenta
