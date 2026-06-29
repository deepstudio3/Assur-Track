# 🚀 ARCHITECTURE OPENWA PERSONNALISÉE - GUIDE DE DÉPLOIEMENT

## 📋 Vue d'ensemble

Ce projet implémente une architecture complète de gestion de sessions WhatsApp basée sur :

- **Moteur OpenWA personnalisé** (Node.js)
- **Conteneurs Docker individuels** par session
- **Gestion des ports dynamiques** (3010+)
- **Persistance hybride** (Redis + PostgreSQL + Volumes Docker)

## 🏗️ Architecture Technique

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   FastAPI       │    │  Session Manager │    │   OpenWA Engine    │
│   (Port 8001)   │◄──►│   (Python)       │◄──►│   (Node.js)        │
│                 │    │                  │    │   (Port 3010+)     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   PostgreSQL    │    │   Docker Engine  │    │  WhatsApp Web API   │
│   (Sessions)    │    │  (Container Mgmt)│    │   (Multi-sessions) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 📦 Composants

### 1. Moteur WhatsApp Engine (`whatsapp-engine/`)
- **package.json** : Dépendances Node.js
- **src/index.js** : Serveur Express avec API REST
- **src/whatsapp-engine.js** : Gestion OpenWA et QR codes
- **src/redis-client.js** : Client Redis pour la persistance
- **Dockerfile** : Image Docker Alpine avec Chrome

### 2. Session Manager (`app/services/session_manager.py`)
- Gestion des conteneurs Docker individuels
- Allocation dynamique des ports (3010-3014)
- Communication avec les conteneurs WhatsApp
- Intégration Redis pour la persistance

### 3. Persistance Hybride (`app/services/persistence_manager.py`)
- **Redis** : QR codes, statuts temporaires
- **PostgreSQL** : Métadonnées persistantes
- **Docker Volumes** : Stockage local des sessions

## 🚀 Déploiement Rapide

### Option 1: Script Automatisé
```bash
# PowerShell (recommandé)
./test_openwa_integration.ps1

# Bash (Linux/macOS)
./test_openwa_integration.sh
```

### Option 2: Manuel
```bash
# 1. Construire le moteur WhatsApp
cd whatsapp-engine
docker build -t whatsapp-openwa-engine:latest .
cd ..

# 2. Démarrer les services
docker-compose up -d postgres redis
sleep 30
docker-compose up -d api

# 3. Vérifier le déploiement
curl http://localhost:8001/health
```

## 🔧 Configuration

### Variables d'Environnement
```bash
# Ports
WHATSAPP_BASE_PORT=3010
MAX_SESSIONS_PER_CLIENT=5

# Redis
REDIS_URL=redis://redis:6379

# Database
DATABASE_URL=postgresql+asyncpg://whatsflow:password@postgres:5432/whatsflow
```

### Ports Utilisés
- **8001** : API FastAPI
- **6380** : Redis (externe)
- **5432** : PostgreSQL (externe)
- **3010-3014** : Sessions WhatsApp (dynamiques)

## 📱 Création de Session

### 1. Créer un Client
```bash
curl -X POST http://localhost:8001/api/clients/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Client",
    "email": "client@example.com",
    "max_sessions": 3
  }'
```

### 2. Créer une Session
```bash
curl -X POST http://localhost:8001/api/session/create \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client_id",
    "session_label": "ma-session"
  }'
```

### 3. Scanner le QR Code
Le QR code est retourné en base64 dans la réponse de création de session.

## 🔍 Monitoring

### Vérifier les Conteneurs
```bash
docker-compose ps
docker ps -a | grep whatsapp_
```

### Logs des Sessions
```bash
docker logs whatsapp_session_id
docker-compose logs -f api
```

### Statut des Sessions
```bash
curl -X GET http://localhost:8001/api/session/{session_id}/status \
  -H "Authorization: Bearer VOTRE_API_KEY"
```

## 🛠️ Dépannage

### Problèmes Communs

1. **Port 3000 déjà utilisé**
   - ✅ Utilisé par le frontend, nous utilisons 3010+

2. **Conteneur WhatsApp ne démarre pas**
   - Vérifier les logs : `docker logs whatsapp_session_id`
   - Vérifier Redis : `docker-compose exec redis redis-cli ping`

3. **QR Code non généré**
   - Attendre 30-60s après création de session
   - Vérifier que le conteneur est en cours d'exécution

4. **Session ne se connecte pas**
   - Scanner le QR code rapidement (validité 2min)
   - Vérifier la connexion internet

### Nettoyage Complet
```bash
docker-compose down --volumes --remove-orphans
docker system prune -f
docker volume prune -f
```

## 📊 Performances

### Capacité
- **Sessions simultanées** : 5 par client (configurable)
- **Messages/seconde** : 1 par session (configurable)
- **Mémoire par session** : ~200MB
- **Démarrage session** : 30-60s

### Scalabilité
- Ajouter des ports dans `WHATSAPP_BASE_PORT` range
- Augmenter `MAX_SESSIONS_PER_CLIENT`
- Utiliser Docker Swarm pour multi-hôtes

## 🔐 Sécurité

- Isolation des conteneurs par session
- Pas d'exposition directe des ports WhatsApp
- Tokens JWT pour l'authentification API
- Redis avec TTL automatique

## 🚀 Prochaines Étapes

1. **Monitoring avancé** : Grafana + Prometheus
2. **Load Balancing** : Nginx reverse proxy
3. **Backup/Restore** : Automatisation des volumes
4. **Multi-régions** : Kubernetes deployment

## 📞 Support

En cas de problème :
1. Vérifier les logs avec `docker-compose logs -f`
2. Exécuter le script de test automatique
3. Consulter la documentation API : http://localhost:8001/docs

---
**Architecture OpenWA Personnalisée v1.0** - Construit pour WhatsFlow 🚀
