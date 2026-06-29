#!/bin/bash

# Script de démarrage de WhatsFlow

echo "🚀 Démarrage de WhatsFlow..."
echo ""

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé. Copie de .env.example..."
    cp .env.example .env
    echo "✅ Fichier .env créé. Veuillez le configurer avant de continuer."
    exit 1
fi

# Démarrer les services Docker
echo "🐳 Démarrage des conteneurs Docker..."
docker-compose up -d

echo ""
echo "⏳ Attente du démarrage des services (15 secondes)..."
sleep 15

# Vérifier la santé de l'API
echo ""
echo "🔍 Vérification de l'API..."
curl -s http://localhost:8000/health | python -m json.tool

echo ""
echo "="
echo "✅ WhatsFlow est démarré!"
echo "="
echo ""
echo "📚 Documentation API: http://localhost:8000/docs"
echo "🔍 Health Check: http://localhost:8000/health"
echo ""
echo "Pour créer un client de test:"
echo "  docker-compose exec api python scripts/create_test_client.py"
echo ""
