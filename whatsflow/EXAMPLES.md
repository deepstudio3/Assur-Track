# 📘 Exemples d'utilisation - WhatsFlow API

Ce document contient des exemples pratiques d'utilisation de l'API WhatsFlow.

---

## 🔑 Authentification

Toutes les requêtes (sauf `/health` et `/`) nécessitent une authentification via API Key.

```bash
# Header à inclure dans chaque requête
Authorization: Bearer VOTRE_API_KEY
```

---

## 📝 Exemples cURL

### 1. Vérifier la santé de l'API

```bash
curl http://localhost:8000/health
```

**Réponse :**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T08:00:00Z",
  "environment": "development"
}
```

---

### 2. Créer un nouveau client

```bash
curl -X POST "http://localhost:8000/api/clients/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Swift AI",
    "email": "contact@swiftai.com",
    "description": "Plateforme IA conversationnelle",
    "max_sessions": 10,
    "messages_per_second": 2
  }'
```

**Réponse :**
```json
{
  "id": "client_abc123",
  "name": "Swift AI",
  "email": "contact@swiftai.com",
  "api_key": "wf_live_xxxxxxxxxxxxxxxxxxx",
  "max_sessions": 10,
  "messages_per_second": 2,
  "is_active": true,
  "created_at": "2025-11-11T08:00:00Z"
}
```

**⚠️ Important : Sauvegardez l'API Key !**

---

### 3. Créer une session WhatsApp

```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client_abc123",
    "session_label": "support-client"
  }'
```

**Réponse :**
```json
{
  "id": "sess_xyz789",
  "client_id": "client_abc123",
  "session_label": "support-client",
  "phone_number": null,
  "status": "awaiting_login",
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "messages_sent": 0,
  "messages_received": 0,
  "last_active": null,
  "created_at": "2025-11-11T08:05:00Z"
}
```

**📱 Scannez le QR code avec WhatsApp pour connecter le compte**

---

### 4. Vérifier le statut d'une session

```bash
curl -X GET "http://localhost:8000/api/sess_xyz789/status" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx"
```

**Réponse :**
```json
{
  "connected": true,
  "phone_number": "+237600000000",
  "client": "Swift AI",
  "last_active": "2025-11-11T08:10:00Z",
  "session_health": "stable",
  "messages_today": 0
}
```

---

### 5. Envoyer un message texte

```bash
curl -X POST "http://localhost:8000/api/sess_xyz789/send-message" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "237600000000",
    "message": "Bonjour ! Bienvenue chez Swift AI 🚀"
  }'
```

**Réponse :**
```json
{
  "status": "sent",
  "message_id": "msg_def456",
  "timestamp": "2025-11-11T08:15:00Z"
}
```

---

### 6. Envoyer une image

```bash
curl -X POST "http://localhost:8000/api/sess_xyz789/send-media" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "237600000000",
    "type": "image",
    "url": "https://example.com/promo.jpg",
    "caption": "Découvrez notre nouvelle offre ! 🎁"
  }'
```

**Réponse :**
```json
{
  "status": "sent",
  "message_id": "msg_ghi789",
  "timestamp": "2025-11-11T08:20:00Z"
}
```

---

### 7. Envoyer un document PDF

```bash
curl -X POST "http://localhost:8000/api/sess_xyz789/send-media" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "237600000000",
    "type": "document",
    "url": "https://example.com/brochure.pdf",
    "filename": "Brochure-Swift-AI.pdf"
  }'
```

---

### 8. Lister toutes les sessions

```bash
curl -X GET "http://localhost:8000/api/session/" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx"
```

**Réponse :**
```json
[
  {
    "id": "sess_xyz789",
    "client_id": "client_abc123",
    "session_label": "support-client",
    "status": "connected",
    "messages_sent": 5,
    "messages_received": 2,
    "created_at": "2025-11-11T08:05:00Z"
  }
]
```

---

### 9. Supprimer une session

```bash
curl -X DELETE "http://localhost:8000/api/session/sess_xyz789" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxxxxxxxxxxx"
```

**Réponse :** `204 No Content`

---

## 🐍 Exemples Python

### Installation

```bash
pip install httpx
```

### Code complet

```python
import httpx
import asyncio

API_BASE_URL = "http://localhost:8000"
API_KEY = "wf_live_xxxxxxxxxxxxxxxxxxx"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

async def main():
    async with httpx.AsyncClient() as client:
        
        # 1. Créer une session
        print("📱 Création d'une session...")
        response = await client.post(
            f"{API_BASE_URL}/api/session/create",
            headers=headers,
            json={
                "client_id": "swift-ai",
                "session_label": "python-test"
            }
        )
        session = response.json()
        session_id = session["id"]
        print(f"✅ Session créée : {session_id}")
        
        # 2. Envoyer un message
        print("\n📤 Envoi d'un message...")
        response = await client.post(
            f"{API_BASE_URL}/api/{session_id}/send-message",
            headers=headers,
            json={
                "to": "237600000000",
                "message": "Message depuis Python 🐍"
            }
        )
        result = response.json()
        print(f"✅ Message envoyé : {result['message_id']}")
        
        # 3. Vérifier le statut
        print("\n🔍 Vérification du statut...")
        response = await client.get(
            f"{API_BASE_URL}/api/{session_id}/status",
            headers=headers
        )
        status = response.json()
        print(f"✅ Statut : {status['session_health']}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🟢 Exemples Node.js

### Installation

```bash
npm install axios
```

### Code complet

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';
const API_KEY = 'wf_live_xxxxxxxxxxxxxxxxxxx';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function main() {
  try {
    // 1. Créer une session
    console.log('📱 Création d\'une session...');
    const sessionResponse = await client.post('/api/session/create', {
      client_id: 'swift-ai',
      session_label: 'nodejs-test'
    });
    const sessionId = sessionResponse.data.id;
    console.log(`✅ Session créée : ${sessionId}`);
    
    // 2. Envoyer un message
    console.log('\n📤 Envoi d\'un message...');
    const messageResponse = await client.post(
      `/api/${sessionId}/send-message`,
      {
        to: '237600000000',
        message: 'Message depuis Node.js 🟢'
      }
    );
    console.log(`✅ Message envoyé : ${messageResponse.data.message_id}`);
    
    // 3. Vérifier le statut
    console.log('\n🔍 Vérification du statut...');
    const statusResponse = await client.get(`/api/${sessionId}/status`);
    console.log(`✅ Statut : ${statusResponse.data.session_health}`);
    
  } catch (error) {
    console.error('❌ Erreur :', error.response?.data || error.message);
  }
}

main();
```

---

## 🔴 Gestion des erreurs

### Erreur 401 - Non autorisé

```json
{
  "detail": "API key invalide ou client inactif"
}
```

**Solution :** Vérifiez votre API Key

---

### Erreur 404 - Session non trouvée

```json
{
  "detail": "Session non trouvée"
}
```

**Solution :** Vérifiez l'ID de la session

---

### Erreur 429 - Quota dépassé

```json
{
  "detail": "Quota de sessions atteint (10 max)"
}
```

**Solution :** Supprimez des sessions inactives ou augmentez votre quota

---

### Erreur 400 - Session non connectée

```json
{
  "detail": "La session n'est pas connectée (statut: awaiting_login)"
}
```

**Solution :** Scannez le QR code pour connecter la session

---

## 🧪 Tests avec Postman

### Collection Postman

Importez cette collection dans Postman :

```json
{
  "info": {
    "name": "WhatsFlow API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:8000"
    },
    {
      "key": "api_key",
      "value": "wf_live_xxxxxxxxxxxxxxxxxxx"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Create Session",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{api_key}}"
          }
        ],
        "url": "{{base_url}}/api/session/create",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"client_id\": \"swift-ai\",\n  \"session_label\": \"test\"\n}"
        }
      }
    }
  ]
}
```

---

## 📚 Ressources supplémentaires

- **Documentation Swagger** : http://localhost:8000/docs
- **Documentation complète** : [documentation.md](documentation.md)
- **Guide de démarrage** : [QUICKSTART.md](QUICKSTART.md)

---

**Besoin d'aide ? Consultez la documentation ou créez une issue sur GitHub.**
