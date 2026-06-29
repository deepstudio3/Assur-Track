# 🔧 Guide de dépannage - WhatsFlow

## Problèmes courants et solutions

---

## ❌ Erreur : "API key invalide ou client inactif"

### Cause
Vous essayez d'accéder à un endpoint protégé sans avoir une API Key valide.

### Solution

#### Étape 1 : Créer un client

**Via Swagger UI** (http://localhost:8000/docs) :
1. Allez sur `/api/clients/` → POST
2. Cliquez sur "Try it out"
3. Entrez les données :
```json
{
  "name": "Swift AI",
  "email": "contact@swiftai.com",
  "description": "Mon premier client",
  "max_sessions": 10,
  "messages_per_second": 2
}
```
4. Cliquez sur "Execute"
5. **COPIEZ l'API Key** retournée dans la réponse

**Via cURL** :
```bash
curl -X POST "http://localhost:8000/api/clients/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Swift AI",
    "email": "contact@swiftai.com",
    "description": "Mon premier client",
    "max_sessions": 10,
    "messages_per_second": 2
  }'
```

**Via le script Python** :
```bash
docker-compose exec api python scripts/create_test_client.py
```

#### Étape 2 : Utiliser l'API Key

Une fois que vous avez l'API Key (format : `wf_live_xxxxxxxxxx`), ajoutez-la dans le header de toutes vos requêtes :

```
Authorization: Bearer wf_live_xxxxxxxxxx
```

**Dans Swagger UI** :
1. Cliquez sur le bouton "Authorize" (🔒) en haut à droite
2. Entrez : `Bearer wf_live_xxxxxxxxxx`
3. Cliquez sur "Authorize"

**Dans Postman** :
1. Ouvrez la collection WhatsFlow
2. Allez dans "Variables"
3. Modifiez `api_key` avec votre clé
4. Ou ajoutez dans chaque requête : Header `Authorization: Bearer wf_live_xxxxxxxxxx`

**Dans cURL** :
```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "votre_client_id",
    "session_label": "test"
  }'
```

---

## ❌ Erreur : "La connexion a été fermée de manière inattendue"

### Cause
L'API n'est pas encore démarrée ou a crashé.

### Solution

#### Vérifier les logs
```bash
docker-compose logs api --tail 50
```

#### Redémarrer l'API
```bash
docker-compose restart api
```

#### Vérifier que les services sont UP
```bash
docker-compose ps
```

Tous les services doivent afficher `Up` dans la colonne STATUS.

---

## ❌ Erreur : "Session non trouvée"

### Cause
L'ID de session utilisé n'existe pas ou appartient à un autre client.

### Solution

#### Lister vos sessions
```bash
curl -X GET "http://localhost:8000/api/session/" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx"
```

#### Créer une nouvelle session
```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "votre_client_id",
    "session_label": "ma-session"
  }'
```

---

## ❌ Erreur : "Quota de sessions atteint"

### Cause
Vous avez atteint le nombre maximum de sessions autorisées pour votre client.

### Solution

#### Option 1 : Supprimer des sessions inactives
```bash
curl -X DELETE "http://localhost:8000/api/session/session_id" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx"
```

#### Option 2 : Augmenter le quota
```bash
curl -X PUT "http://localhost:8000/api/clients/votre_client_id" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "max_sessions": 20
  }'
```

---

## ❌ Erreur : "Session non connectée"

### Cause
La session WhatsApp n'est pas encore connectée (QR code non scanné).

### Solution

1. Créez une session
2. Récupérez le QR code dans la réponse
3. Scannez-le avec WhatsApp
4. Attendez quelques secondes
5. Vérifiez le statut :
```bash
curl -X GET "http://localhost:8000/api/session_id/status" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx"
```

---

## ❌ L'API ne démarre pas

### Erreur : "psycopg2 is not async"

#### Solution
Cette erreur a été corrigée. Reconstruisez l'image :
```bash
docker-compose down
docker-compose up -d --build
```

### Erreur : "Cannot connect to database"

#### Solution
Attendez que PostgreSQL démarre complètement (30 secondes), puis :
```bash
docker-compose restart api
```

---

## ❌ Port déjà utilisé

### Erreur : "port is already allocated"

#### Solution

**Option 1 : Arrêter le service qui utilise le port**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Option 2 : Changer le port dans docker-compose.yml**
```yaml
ports:
  - "8001:8000"  # Utiliser 8001 au lieu de 8000
```

---

## 🔍 Commandes de diagnostic

### Vérifier l'état des conteneurs
```bash
docker-compose ps
```

### Voir les logs en temps réel
```bash
docker-compose logs -f
```

### Voir les logs d'un service spécifique
```bash
docker-compose logs api
docker-compose logs postgres
docker-compose logs redis
```

### Tester la connexion à l'API
```bash
curl http://localhost:8000/health
```

### Accéder au conteneur API
```bash
docker-compose exec api bash
```

### Vérifier les variables d'environnement
```bash
docker-compose exec api env | grep DATABASE
```

---

## 🔄 Réinitialisation complète

Si rien ne fonctionne, réinitialisez tout :

```bash
# Arrêter et supprimer tous les conteneurs
docker-compose down -v

# Supprimer les images
docker rmi whatsflow-api

# Reconstruire et redémarrer
docker-compose up -d --build

# Attendre 30 secondes
Start-Sleep -Seconds 30

# Vérifier
docker-compose ps
curl http://localhost:8000/health
```

---

## 📝 Workflow de test complet

### 1. Vérifier que tout fonctionne
```bash
docker-compose ps
curl http://localhost:8000/health
```

### 2. Créer un client
```bash
curl -X POST "http://localhost:8000/api/clients/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com",
    "max_sessions": 5
  }'
```

**Notez l'API Key et le client_id retournés !**

### 3. Créer une session
```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "VOTRE_CLIENT_ID",
    "session_label": "test-session"
  }'
```

**Notez le session_id retourné !**

### 4. Vérifier le statut
```bash
curl -X GET "http://localhost:8000/api/VOTRE_SESSION_ID/status" \
  -H "Authorization: Bearer VOTRE_API_KEY"
```

### 5. Envoyer un message
```bash
curl -X POST "http://localhost:8000/api/VOTRE_SESSION_ID/send-message" \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "237600000000",
    "message": "Test message"
  }'
```

---

## 🆘 Besoin d'aide supplémentaire ?

1. Vérifiez les logs : `docker-compose logs api --tail 100`
2. Consultez la documentation : `START_HERE.md`, `QUICKSTART.md`
3. Testez avec Swagger UI : http://localhost:8000/docs
4. Utilisez la collection Postman : `WhatsFlow.postman_collection.json`

---

**Dernière mise à jour : 11 novembre 2025**
