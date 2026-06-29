# Script PowerShell pour créer un client WhatsFlow et obtenir l'API Key

Write-Host "🚀 Création d'un client WhatsFlow..." -ForegroundColor Cyan
Write-Host ""

# Données du client
$clientData = @{
    name = "Swift AI"
    email = "contact@swiftai.com"
    description = "Client de test WhatsFlow"
    max_sessions = 10
    messages_per_second = 2
} | ConvertTo-Json

# URL de l'API
$apiUrl = "http://localhost:8000/api/clients/"

try {
    # Créer le client
    Write-Host "📤 Envoi de la requête..." -ForegroundColor Yellow
    
    $responseRaw = Invoke-WebRequest -Uri $apiUrl -Method Post -Body $clientData -ContentType "application/json" -UseBasicParsing
    $response = $responseRaw.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "✅ Client créé avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Informations du client :" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "ID:                 $($response.id)" -ForegroundColor White
    Write-Host "Nom:                $($response.name)" -ForegroundColor White
    Write-Host "Email:              $($response.email)" -ForegroundColor White
    Write-Host "Max Sessions:       $($response.max_sessions)" -ForegroundColor White
    Write-Host "Messages/seconde:   $($response.messages_per_second)" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔑 API KEY (IMPORTANT - COPIEZ-LA) :" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host $response.api_key -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Utilisez cette API Key dans vos requêtes :" -ForegroundColor Cyan
    Write-Host "   Authorization: Bearer $($response.api_key)" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Exemple de création de session :" -ForegroundColor Cyan
    Write-Host @"
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer $($response.api_key)" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "$($response.id)",
    "session_label": "ma-session"
  }'
"@ -ForegroundColor White
    Write-Host ""
    
    # Sauvegarder dans un fichier
    $credentials = @{
        client_id = $response.id
        api_key = $response.api_key
        name = $response.name
        email = $response.email
        created_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    } | ConvertTo-Json
    
    $credentials | Out-File -FilePath "client_credentials.json" -Encoding UTF8
    Write-Host "💾 Credentials sauvegardées dans: client_credentials.json" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de la création du client !" -ForegroundColor Red
    Write-Host ""
    Write-Host "Détails de l'erreur :" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host '🔍 Vérifications :' -ForegroundColor Cyan
    Write-Host '  1. L''API est-elle démarrée ? Testez: curl http://localhost:8000/health' -ForegroundColor White
    Write-Host '  2. Le port 8000 est-il accessible ?' -ForegroundColor White
    Write-Host '  3. Docker est-il en cours d''exécution ? Testez: docker-compose ps' -ForegroundColor White
    Write-Host ""
    exit 1
}
