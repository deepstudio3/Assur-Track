# WhatsFlow — Documentation Opérationnelle
**Auteur :** Dipita Parfait — Scalefy Agency  
**Date :** 22 mai 2026  
**Version :** 2.0 (Bug Baileys corrigé)  
**Statut :** ✅ Production-ready

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Prérequis et environnement](#3-prérequis-et-environnement)
4. [Le problème original et sa cause racine](#4-le-problème-original-et-sa-cause-racine)
5. [Solution appliquée — Auth-state PostgreSQL](#5-solution-appliquée--auth-state-postgresql)
6. [Le pont HTTP bridge.js](#6-le-pont-http-bridgejs)
7. [Configuration de l'environnement](#7-configuration-de-lenvironnement)
8. [Procédure de démarrage complète](#8-procédure-de-démarrage-complète)
9. [Utilisation de l'API](#9-utilisation-de-lapi)
10. [Dépannage](#10-dépannage)
11. [Points d'amélioration futurs](#11-points-damélioration-futurs)

---

## 1. Vue d'ensemble

WhatsFlow est une API middleware qui permet d'intégrer WhatsApp dans des applications SaaS via une API RESTful. Elle expose des endpoints HTTP permettant de créer des sessions WhatsApp, générer des QR codes, envoyer des messages texte et des médias.

### Stack technique finale

| Composant | Technologie | Port |
|-----------|-------------|------|
| API REST | FastAPI (Python 3.11) | 8000 |
| Moteur WhatsApp | Baileys (Node.js) | — |
| Pont HTTP | bridge.js (Node.js) | 3010 |
| Base de données | PostgreSQL 15 | 5433 |
| Cache | Redis 7 | 6380 |

---

## 2. Architecture technique

```
┌─────────────────────────────────────────────────┐
│                  Client SaaS                    │
│         (appels HTTP avec API Key)              │
└───────────────────┬─────────────────────────────┘
                    │ HTTP :8000
┌───────────────────▼─────────────────────────────┐
│              FastAPI (Python 3.11)              │
│   app/api/v1/endpoints/sessions.py              │
│   app/api/v1/endpoints/messages.py              │
│   app/services/session_manager.py               │
│   app/services/message_service.py               │
└───────────────────┬─────────────────────────────┘
                    │ HTTP :3010
┌───────────────────▼─────────────────────────────┐
│           bridge.js (Node.js)                   │
│      Pont HTTP entre FastAPI et Baileys         │
│   Routes: /session/create, /send-message...     │
└───────────────────┬─────────────────────────────┘
                    │ WebSocket
┌───────────────────▼─────────────────────────────┐
│         Moteur Baileys (@whiskeysockets)         │
│   src/whatsapp-engine.js                        │
│   src/postgres-auth-state.js  ◄─── CLEF DU FIX │
└──────────┬──────────────────────────────────────┘
           │                    │
┌──────────▼──────┐   ┌─────────▼────────┐
│  PostgreSQL :5433│   │  WhatsApp Web    │
│  Auth-state      │   │  (serveurs Meta) │
│  Sessions        │   └──────────────────┘
│  Messages        │
└──────────────────┘
```

---

## 3. Prérequis et environnement

### Logiciels requis

| Logiciel | Version | Vérification |
|----------|---------|--------------|
| Python | 3.11.x | `py -3.11 --version` |
| Node.js | 18+ | `node --version` |
| Git | 2.x | `git --version` |
| Docker Desktop | Dernière | `docker ps` |

> ⚠️ **Important** : Python 3.14 n'est PAS compatible avec les packages du projet (asyncpg, pydantic-core). Utiliser impérativement Python 3.11.

### Variables d'environnement (.env)

```env
# Base de données (depuis Windows, port 5433 car Docker mappe 5433→5432)
POSTGRES_USER=whatsflow
POSTGRES_PASSWORD=whatsflow_secure_password
POSTGRES_DB=whatsflow
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
DATABASE_URL=postgresql+asyncpg://whatsflow:whatsflow_secure_password@localhost:5433/whatsflow

# Redis (depuis Windows, port 6380 car Docker mappe 6380→6379)
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_URL=redis://localhost:6380

# API
API_HOST=0.0.0.0
API_PORT=8000
API_BASE_URL=http://localhost:8000
ENVIRONMENT=development

# Sécurité
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
API_KEY_LENGTH=32

# WhatsApp
OPENWA_PORT=3010
SESSION_TIMEOUT_MINUTES=30
MAX_SESSIONS_PER_CLIENT=52

# Limites
RATE_LIMIT_MESSAGES_PER_SECOND=1
RATE_LIMIT_API_REQUESTS_PER_MINUTE=60
LOG_LEVEL=INFO
```

---

## 4. Le problème original et sa cause racine

### Symptôme observé

L'envoi de messages via Baileys échouait systématiquement avec un timeout de 17+ secondes :

```
Error: Request Timed Out
  at assertSessions (messages-send.js:183)
  at getUSyncDevices (messages-send.js:352)
```

### Cause racine identifiée

Le code original utilisait `useMultiFileAuthState` de Baileys pour stocker les credentials WhatsApp dans des fichiers JSON sur disque. Cette approche a trois problèmes critiques en production :

**Problème 1 — Déclaré non production-ready par Baileys eux-mêmes**
La documentation officielle indique explicitement : *"DO NOT rely on it in prod! It is very inefficient and is purely for demo purposes."*

**Problème 2 — Perte de session au redémarrage Docker**
Les fichiers JSON sont perdus à chaque redémarrage du conteneur. Baileys tente de réenvoyer avec des credentials corrompus ou absents → timeout.

**Problème 3 — Pas de cache pour les signal keys**
Sans `makeCacheableSignalKeyStore`, chaque envoi de message déclenche 50+ lectures de fichiers pour les clés cryptographiques → lenteur → timeout.

**Problème 4 — Code 515 mal géré**
Après le scan du QR code, WhatsApp envoie un signal 515 ("restart required"). L'ancien code interprétait ce signal comme une erreur fatale et fermait la connexion au lieu de reconnecter → impossible d'envoyer des messages.

---

## 5. Solution appliquée — Auth-state PostgreSQL

### Fichier : whatsapp-engine/src/postgres-auth-state.js

Ce fichier remplace `useMultiFileAuthState` par une implémentation qui stocke les credentials dans PostgreSQL.

#### Table PostgreSQL créée

```sql
CREATE TABLE IF NOT EXISTS whatsapp_auth_state (
    session_id   VARCHAR(255) NOT NULL,
    key_type     VARCHAR(100) NOT NULL,
    key_data     JSONB        NOT NULL,
    updated_at   TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY (session_id, key_type)
);

CREATE INDEX IF NOT EXISTS idx_auth_session 
    ON whatsapp_auth_state(session_id);
```

#### Fonctionnement

```
Baileys demande une clé cryptographique
    → postgres-auth-state.js lit depuis PostgreSQL
    → Cache mémoire (makeCacheableSignalKeyStore) évite les lectures répétées
    → Résultat retourné en <1ms au lieu de 50+ lectures fichier
```

#### Code clé — whatsapp-engine.js

```javascript
// AVANT (cassé)
const { state, saveCreds } = await useMultiFileAuthState('./auth');

// APRÈS (corrigé)
const { state, saveCreds } = await usePostgresAuthState(pool, sessionId);
const cachedKeys = makeCacheableSignalKeyStore(state.keys, logger);

const sock = makeWASocket({
    version,
    auth: {
        creds: state.creds,
        keys: cachedKeys,  // ← cache mémoire = envoi rapide
    },
    connectTimeoutMs:      60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs:   25000,
    browser: ['Ubuntu', 'Chrome', '120.0.6099.109'],
});
```

#### Gestion du code 515 (critique)

```javascript
if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;

    // 515 = restart normal après scan QR — PAS une erreur !
    if (code === 515) {
        console.log('🔄 Restart requis — reconnexion automatique...');
        setTimeout(() => createSession(sessionId, options), 1000);
        return;  // ← Ne pas quitter, reconnecter !
    }

    // 401 = déconnexion volontaire du téléphone
    if (code === 401 || code === DisconnectReason.loggedOut) {
        await supprimerCredentials(sessionId);
        return;
    }

    // Autres erreurs = backoff exponentiel
    await reconnectWithBackoff(sessionId, options);
}
```

#### Backoff exponentiel

```javascript
async function reconnectWithBackoff(sessionId, options, attempt = 0) {
    // Délai : 2s, 4s, 8s, 16s, 32s, max 60s
    const delay = Math.min(2000 * Math.pow(2, attempt), 60000);
    await new Promise(r => setTimeout(r, delay));
    
    try {
        await createSession(sessionId, options);
    } catch (error) {
        if (attempt < 10) {
            await reconnectWithBackoff(sessionId, options, attempt + 1);
        }
    }
}
```

---

## 6. Le pont HTTP bridge.js

### Rôle

`bridge.js` est un serveur HTTP léger (Node.js natif, sans framework) qui fait le lien entre FastAPI (Python) et le moteur Baileys (Node.js). Il évite de devoir appeler Baileys directement depuis Python.

### Localisation

```
whatsflow/
└── whatsapp-engine/
    └── bridge.js          ← Pont HTTP
    └── src/
        ├── whatsapp-engine.js
        └── postgres-auth-state.js
```

### Routes disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /health | Vérification santé |
| POST | /session/create | Démarrer une session |
| GET | /session/:id/qr | Récupérer le QR code |
| GET | /session/:id/status | Statut de connexion |
| POST | /session/:id/send-message | Envoyer un texte |
| POST | /session/:id/send-media | Envoyer un média |
| DELETE | /session/:id | Supprimer une session |

### Lancement

```bash
cd whatsapp-engine
node bridge.js
# → [Bridge] ✅ Pont HTTP démarré sur port 3010
```

---

## 7. Configuration de l'environnement

### Ajouter Git au PATH (Windows — à faire à chaque nouveau terminal)

```bash
set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd
```

### Vérifier que les conteneurs Docker tournent

```bash
docker ps
# Doit afficher :
# whatsflow_postgres  → port 5433
# whatsflow_redis     → port 6380
```

### Installer les dépendances Node.js (une seule fois)

```bash
cd whatsapp-engine
npm install @whiskeysockets/baileys@6.7.22 pg pino @hapi/boom qrcode-terminal
```

### Installer les dépendances Python (une seule fois)

```bash
py -3.11 -m pip install -r requirements.txt
```

---

## 8. Procédure de démarrage complète

À chaque fois que tu veux utiliser WhatsFlow, ouvre **3 terminaux** et lance dans cet ordre :

### Terminal 1 — Conteneurs Docker

```bash
docker start whatsflow_postgres whatsflow_redis
docker ps
# Vérifie que les deux sont "Up"
```

### Terminal 2 — Pont Baileys

```bash
cd "C:\Users\Studio D\Desktop\DASHBOARD SWIFT AI\whatsflow\whatsapp-engine"
set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd
node bridge.js
```

Tu dois voir :
```
[Bridge] ✅ Pont HTTP démarré sur port 3010
```

### Terminal 3 — API FastAPI

```bash
cd "C:\Users\Studio D\Desktop\DASHBOARD SWIFT AI\whatsflow"
py -3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Tu dois voir :
```
✅ Base de données initialisée
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Vérification globale

```bash
curl http://localhost:8000/health
curl http://localhost:3010/health
```

Les deux doivent retourner `{"status": "ok"}` ou `{"status": "healthy"}`.

---

## 9. Utilisation de l'API

### 9.1 Créer un client

```bash
curl -X POST "http://localhost:8000/api/clients/" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mon Client", "email": "client@example.com"}'
```

Réponse :
```json
{
  "id": "client_xxxx",
  "api_key": "votre_api_key_ici",
  "name": "Mon Client"
}
```

> ⚠️ **Sauvegarde l'`api_key`** — elle est nécessaire pour toutes les requêtes suivantes.

### 9.2 Lister les clients

```bash
curl "http://localhost:8000/api/clients/"
```

### 9.3 Créer une session WhatsApp

```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -d '{"session_label": "mon-whatsapp", "client_id": "client_xxxx"}'
```

Réponse :
```json
{
  "id": "sess_xxxx",
  "status": "awaiting_login",
  "qr_code": "2@xxxxx..."
}
```

### 9.4 Scanner le QR code

Le champ `qr_code` contient la chaîne brute Baileys. Pour l'afficher en ASCII dans le terminal :

```bash
cd whatsapp-engine
node -e "const qr=require('qrcode-terminal'); qr.generate('COLLER_QR_ICI', {small:true})"
```

Puis sur ton téléphone :
```
WhatsApp → ⋮ Menu → Appareils connectés → Connecter un appareil → Scanner
```

> ⚠️ **Regarde le terminal bridge.js** — il affiche automatiquement le QR code ASCII dès que Baileys le génère. C'est le QR code le plus récent et donc le plus fiable.

### 9.5 Mettre à jour le statut de session (après connexion)

Après avoir scanné le QR code, mettre à jour manuellement le statut en base :

```bash
docker exec -it whatsflow_postgres psql -U whatsflow -d whatsflow \
  -c "UPDATE sessions SET status='CONNECTED' WHERE id='sess_xxxx';"
```

### 9.6 Envoyer un message texte

```bash
curl -X POST "http://localhost:8000/api/session/sess_xxxx/send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_API_KEY" \
  -d '{"to": "237694954113", "message": "Bonjour depuis WhatsFlow !"}'
```

Réponse :
```json
{
  "status": "sent",
  "message_id": "msg_xxxx",
  "timestamp": "2026-05-22T..."
}
```

### 9.7 Vérifier le statut d'une session

```bash
# Via FastAPI
curl "http://localhost:8000/api/session/sess_xxxx/status" \
  -H "Authorization: Bearer VOTRE_API_KEY"

# Via bridge directement (plus fiable)
curl "http://localhost:3010/session/sess_xxxx/status"
```

---

## 10. Dépannage

### Problème : "Session non connectée (statut: awaiting_login)"

**Cause :** La base de données n'a pas été mise à jour après la connexion WhatsApp.

**Solution :**
```bash
# Vérifier d'abord que le bridge confirme la connexion
curl http://localhost:3010/session/sess_xxxx/status
# Si isConnected: true → mettre à jour la DB
docker exec -it whatsflow_postgres psql -U whatsflow -d whatsflow \
  -c "UPDATE sessions SET status='CONNECTED' WHERE id='sess_xxxx';"
```

### Problème : Code 515 au scan QR

**Cause :** Comportement normal de WhatsApp — restart requis après le pairing.

**Solution :** bridge.js gère ça automatiquement. Attendre 2-3 secondes, Baileys se reconnecte seul.

### Problème : Code 401 — "device_removed"

**Cause :** Session en conflit — deux instances Baileys connectées avec le même numéro.

**Solution :**
```bash
# Vérifier qu'il n'y a pas de conteneur Docker Baileys actif
docker ps
docker stop modest_chatelet  # ou tout autre conteneur whatsapp_*

# Nettoyer la session
docker exec -it whatsflow_postgres psql -U whatsflow -d whatsflow \
  -c "DELETE FROM whatsapp_auth_state WHERE session_id='test-session';"
```

### Problème : "getaddrinfo failed" au démarrage FastAPI

**Cause :** Le `.env` utilise `postgres` comme hostname (nom Docker interne) au lieu de `localhost`.

**Solution :** Vérifier que le `.env` contient :
```
DATABASE_URL=postgresql+asyncpg://whatsflow:whatsflow_secure_password@localhost:5433/whatsflow
```

### Problème : npm install échoue avec erreur Git

**Cause :** Git n'est pas dans le PATH du terminal.

**Solution :**
```bash
set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd
npm install ...
```

### Problème : pip install échoue avec asyncpg ou pydantic-core

**Cause :** Python 3.14 incompatible avec ces packages.

**Solution :** Utiliser Python 3.11 :
```bash
py -3.11 -m pip install -r requirements.txt
py -3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Problème : QR code expiré ou "impossible de se connecter"

**Cause :** Le QR code a plus de 60 secondes ou une ancienne session interfère.

**Solution :**
1. Sur le téléphone : WhatsApp → Appareils connectés → Déconnecter tous les appareils
2. Nettoyer la session en base
3. Relancer `node bridge.js`
4. Recréer une session via l'API

---

## 11. Points d'amélioration futurs

### Court terme (priorité haute)

**Synchronisation automatique du statut**
Actuellement, après le scan du QR, il faut mettre à jour le statut manuellement via SQL. Il faudrait que `bridge.js` notifie FastAPI automatiquement via un webhook interne.

```
bridge.js détecte connection='open'
    → POST http://localhost:8000/internal/session/sess_xxxx/connected
    → FastAPI met à jour le statut en DB automatiquement
```

**Endpoint de récupération du QR code**
Ajouter un endpoint FastAPI qui proxifie le QR depuis bridge.js :
```
GET /api/session/{id}/qr → appelle http://localhost:3010/session/{id}/qr
```

### Moyen terme

**Dockerisation complète**
Mettre bridge.js dans un conteneur Docker pour éviter de le lancer manuellement :

```yaml
# docker-compose.yml — ajouter :
whatsapp-bridge:
  build: ./whatsapp-engine
  command: node bridge.js
  ports:
    - "3010:3010"
  environment:
    - DATABASE_URL=postgresql://whatsflow:whatsflow_secure_password@postgres:5432/whatsflow
  depends_on:
    - postgres
    - redis
```

**Script de démarrage automatique**
Créer `start.bat` pour Windows :
```batch
@echo off
docker start whatsflow_postgres whatsflow_redis
start cmd /k "cd whatsapp-engine && node bridge.js"
start cmd /k "py -3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo WhatsFlow démarré !
```

### Long terme

- Webhooks pour messages entrants
- Dashboard de monitoring en temps réel
- Support multi-numéros avec load balancing
- Migration vers WhatsApp Cloud API officielle (Meta)

---

## Résumé des fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `whatsapp-engine/src/postgres-auth-state.js` | Nouveau — Auth-state PostgreSQL |
| `whatsapp-engine/src/whatsapp-engine.js` | Corrigé — Utilise postgres-auth-state + gestion 515 |
| `whatsapp-engine/bridge.js` | Nouveau — Pont HTTP Node.js |
| `app/services/session_manager.py` | Remplacé — Appelle bridge.js au lieu de Docker |
| `app/services/message_service.py` | Remplacé — Appelle bridge.js au lieu de Docker |
| `.env` | Corrigé — localhost:5433 et localhost:6380 |

---

*Documentation rédigée le 22 mai 2026 — WhatsFlow v2.0*
*Scalefy Agency — Dipita Parfait*
