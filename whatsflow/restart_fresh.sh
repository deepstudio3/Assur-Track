#!/bin/bash

echo "🔄 Nettoyage complet de l'environnement Docker..."

# Arrêter et supprimer tous les conteneurs
docker-compose down --volumes --remove-orphans

# Supprimer les images non utilisées
docker image prune -f

# Supprimer les volumes (attention, cela efface les données)
docker volume prune -f

echo "✅ Nettoyage terminé"
echo "🚀 Démarrage de la nouvelle configuration..."

# Démarrer avec la nouvelle configuration
docker-compose up --build -d

echo "⏳ Attente du démarrage des services..."
sleep 30

# Vérifier les services
echo "📊 État des services:"
docker-compose ps

echo "🔍 Logs du service WhatsApp:"
docker-compose logs whatsapp-service --tail=20

echo "🌐 API disponible sur: http://localhost:8001"
echo "📱 WhatsApp API disponible sur: http://localhost:3000"
echo "📚 Documentation Swagger: http://localhost:3000/api/docs"
