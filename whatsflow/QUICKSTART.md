# 🚀 Guide de Démarrage Rapide - WhatsFlow

## 📋 Prérequis

- Docker & Docker Compose installés
- Python 3.11+ (pour les scripts locaux)
- Git

## ⚡ Installation en 5 minutes

### 1. Cloner le projet

```bash
git clone https://github.com/yourname/whatsflow.git
cd whatsflow
```

### 2. Configurer les variables d'environnement

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

**Important:** Modifiez le fichier `.env` et changez au minimum :
- `JWT_SECRET` (utilisez une clé sécurisée)
- `POSTGRES_PASSWORD` (en production)

### 3. Démarrer les services

#### Windows PowerShell
```powershell
.\start.ps1
```

#### Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

#### Ou manuellement avec Docker Compose
```bash
docker-compose up -d
```

### 4. Vérifier que l'API fonctionne

Ouvrez votre navigateur : [http://localhost:8000/docs](http://localhost:8000/docs)

Ou via curl :
```bash
curl http://localhost:8000/health
```

### 5. Créer un client de test

```bash
docker-compose exec api python scripts/create_test_client.py
```

**Notez bien l'API Key générée** - vous en aurez besoin pour les requêtes !

---

## 🧪 Tester l'API

### Option 1 : Via Swagger UI (Recommandé)

1. Ouvrez [http://localhost:8000/docs](http://localhost:8000/docs)
2. Cliquez sur **Authorize** en haut à droite
3. Entrez : `Bearer VOTRE_API_KEY`
4. Testez les endpoints directement

### Option 2 : Via curl

#### Créer une session WhatsApp
```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "swift-ai",
    "session_label": "test-session"
  }'
```

#### Envoyer un message
```bash
curl -X POST "http://localhost:8000/api/SESSION_ID/send-message" \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "237600000000",
    "message": "Hello from WhatsFlow!"
  }'
```

### Option 3 : Script Python de test

```bash
# Modifier scripts/test_api.py avec votre API Key
python scripts/test_api.py
```

---

## 📊 Accéder aux services

| Service | URL | Description |
|---------|-----|-------------|
| **API Documentation** | http://localhost:8000/docs | Interface Swagger |
| **API Health Check** | http://localhost:8000/health | Statut de l'API |
| **PostgreSQL** | localhost:5432 | Base de données |
| **Redis** | localhost:6379 | Cache |

---

## 🛠️ Commandes utiles

### Voir les logs
```bash
docker-compose logs -f api
```

### Redémarrer l'API
```bash
docker-compose restart api
```

### Arrêter tous les services
```bash
docker-compose down
```

### Supprimer tout (y compris les données)
```bash
docker-compose down -v
```

### Accéder au conteneur API
```bash
docker-compose exec api bash
```

### Exécuter les tests
```bash
docker-compose exec api pytest
```

---

## 🔧 Résolution de problèmes

### L'API ne démarre pas
```bash
# Vérifier les logs
docker-compose logs api

# Vérifier que PostgreSQL est prêt
docker-compose logs postgres
```

### Erreur de connexion à la base de données
```bash
# Attendre quelques secondes que PostgreSQL démarre
# Puis redémarrer l'API
docker-compose restart api
```

### Port déjà utilisé
Si le port 8000 est déjà utilisé, modifiez dans `docker-compose.yml` :
```yaml
ports:
  - "8001:8000"  # Utiliser 8001 au lieu de 8000
```

---

## 📚 Prochaines étapes

1. ✅ **Lire la documentation complète** : `documentation.md`
2. 🔐 **Configurer l'authentification** pour vos clients
3. 🐳 **Intégrer OpenWA** pour les vraies sessions WhatsApp
4. 📊 **Configurer le monitoring** (Prometheus + Grafana)
5. 🚀 **Déployer en production**

---

## 💡 Besoin d'aide ?

- 📖 Documentation complète : `documentation.md`
- 🐛 Signaler un bug : [GitHub Issues]
- 💬 Support : contact@whatsflow.io

---

**Bon développement avec WhatsFlow ! 🚀**
