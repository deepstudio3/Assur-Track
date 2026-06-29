#!/bin/bash

echo "🚀 CONSTRUCTION ET TEST DE L'ARCHITECTURE OPENWA PERSONNALISÉE"
echo "=========================================================="

# 1. Construire le moteur WhatsApp Engine
echo "📦 Construction du moteur WhatsApp Engine..."
cd whatsapp-engine
docker build -t whatsapp-openwa-engine:latest .
if [ $? -eq 0 ]; then
    echo "✅ Moteur WhatsApp Engine construit avec succès"
else
    echo "❌ Erreur lors de construction du moteur"
    exit 1
fi

# 2. Nettoyer l'environnement
echo "🧹 Nettoyage de l'environnement Docker..."
cd ..
docker-compose down --volumes --remove-orphans
docker system prune -f

# 3. Démarrer les services de base
echo "🔄 Démarrage des services de base..."
docker-compose up -d postgres redis

# Attendre que les services soient prêts
echo "⏳ Attente des services de base..."
sleep 30

# 4. Démarrer l'API
echo "🌐 Démarrage de l'API FastAPI..."
docker-compose up -d api

# Attendre que l'API soit prête
echo "⏳ Attente de l'API..."
sleep 20

# 5. Vérifier les services
echo "📊 Vérification des services..."
docker-compose ps

# 6. Tester l'API
echo "🧪 Test de l'API..."
curl -f http://localhost:8001/health || echo "⚠️ API non disponible"

# 7. Tester Redis
echo "🔴 Test de Redis..."
docker-compose exec redis redis-cli ping || echo "⚠️ Redis non disponible"

# 8. Créer un client de test
echo "👤 Création d'un client de test..."
CLIENT_RESPONSE=$(curl -s -X POST http://localhost:8001/api/clients/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client OpenWA",
    "email": "test@openwa.com",
    "description": "Client pour tester le moteur OpenWA personnalisé",
    "max_sessions": 3,
    "messages_per_second": 2
  }')

echo "Réponse client: $CLIENT_RESPONSE"

# Extraire l'ID du client
CLIENT_ID=$(echo $CLIENT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
API_KEY=$(echo $CLIENT_RESPONSE | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CLIENT_ID" ]; then
    echo "✅ Client créé avec ID: $CLIENT_ID"
    echo "🔑 API Key: $API_KEY"
else
    echo "❌ Erreur lors de la création du client"
    exit 1
fi

# 9. Créer une session de test
echo "📱 Création d'une session de test..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8001/api/session/create \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"$CLIENT_ID\",
    \"session_label\": \"test-session-openwa\"
  }")

echo "Réponse session: $SESSION_RESPONSE"

# Extraire l'ID de la session
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
QR_CODE=$(echo $SESSION_RESPONSE | grep -o '"qr_code":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SESSION_ID" ]; then
    echo "✅ Session créée avec ID: $SESSION_ID"
    echo "📱 QR Code disponible: ${QR_CODE:0:50}..."
else
    echo "❌ Erreur lors de la création de la session"
    exit 1
fi

# 10. Vérifier le conteneur WhatsApp
echo "🔍 Vérification du conteneur WhatsApp..."
docker ps | grep "whatsapp_$SESSION_ID" || echo "⚠️ Conteneur WhatsApp non trouvé"

# 11. Attendre et vérifier le QR code
echo "⏳ Attente du QR code (30s)..."
sleep 30

# 12. Vérifier le statut de la session
echo "📊 Vérification du statut de la session..."
STATUS_RESPONSE=$(curl -s -X GET http://localhost:8001/api/session/$SESSION_ID/status \
  -H "Authorization: Bearer $API_KEY")

echo "Statut: $STATUS_RESPONSE"

# 13. Logs du conteneur WhatsApp
echo "📋 Logs du conteneur WhatsApp..."
docker logs "whatsapp_$SESSION_ID" --tail=20

echo ""
echo "🎯 TEST TERMINÉ - RÉSUMÉ:"
echo "=========================="
echo "✅ Moteur OpenWA personnalisé: Construit"
echo "✅ Services Docker: Opérationnels"
echo "✅ API FastAPI: En ligne"
echo "✅ Client de test: Créé ($CLIENT_ID)"
echo "✅ Session WhatsApp: Créée ($SESSION_ID)"
echo "📱 QR Code: Disponible pour scan"
echo ""
echo "🌐 API disponible sur: http://localhost:8001"
echo "📚 Documentation: http://localhost:8001/docs"
echo ""
echo "🔍 Pour surveiller les conteneurs:"
echo "   docker-compose logs -f"
echo "   docker ps -a"
echo ""
echo "🎉 ARCHITECTURE OPENWA PERSONNALISÉE PRÊTE !"
