# 📚 Documentation Complète API WhatsFlow

**Version** : 1.0.0  
**Date** : Novembre 2025  
**Base URL** : `https://api.whatsflow.io` (ou `http://localhost:8001` en développement)

---

## 📖 Table des Matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Gestion des Clients](#gestion-des-clients)
4. [Gestion des Sessions](#gestion-des-sessions)
5. [Envoi de Messages](#envoi-de-messages)
6. [Codes d'Erreur](#codes-derreur)
7. [Limites et Quotas](#limites-et-quotas)
8. [Exemples Complets](#exemples-complets)
9. [FAQ](#faq)

---

## Introduction

### Qu'est-ce que WhatsFlow ?

WhatsFlow est une API middleware pour WhatsApp Business qui permet aux entreprises d'automatiser l'envoi et la réception de messages WhatsApp à grande échelle.

### Cas d'Usage

- 📱 Envoi de notifications et alertes
- 🤖 Chatbots conversationnels
- 📊 Notifications de commandes et livraisons
- 🎯 Campagnes marketing ciblées
- 💼 Support client automatisé

---

## Authentification

### Vue d'ensemble

Toutes les requêtes à l'API (sauf création de client) doivent inclure un header `Authorization` avec votre clé API.

### Format du Header

```
Authorization: Bearer YOUR_API_KEY_HERE
```

### Exemple avec cURL

```bash
curl -X GET https://api.whatsflow.io/api/clients/ \
  -H "Authorization: Bearer whatsflow_abc123xyz789" \
  -H "Content-Type: application/json"
```

### Sécurité

⚠️ **IMPORTANT** :
- Ne partagez JAMAIS votre clé API publiquement
- Stockez-la dans des variables d'environnement
- Régénérez votre clé si elle est compromise
- Utilisez HTTPS pour toutes les requêtes

---

## Gestion des Clients

### Créer un Client

**Endpoint** : `POST /api/clients/`

**Body** :

```json
{
  "name": "Ma Boutique E-commerce",
  "email": "contact@maboutique.com",
  "description": "Plateforme de vente en ligne",
  "max_sessions": 10,
  "messages_per_second": 5
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `name` | string | ✅ | Nom unique du client (max 255 caractères) |
| `email` | string | ✅ | Email unique du client |
| `description` | string | ❌ | Description du client |
| `max_sessions` | integer | ❌ | Nombre maximum de sessions (défaut: 5) |
| `messages_per_second` | integer | ❌ | Limite de messages/sec (défaut: 1) |

**Réponse** (201 Created) :

```json
{
  "id": "client_a3ee05324981",
  "name": "Ma Boutique E-commerce",
  "email": "contact@maboutique.com",
  "api_key": "whatsflow_jcwnxJ9hiXW1yqVp9s00TwvxQKbJxi5jbIiI-seOVuc",
  "max_sessions": 10,
  "messages_per_second": 5,
  "is_active": true,
  "created_at": "2025-11-17T21:07:50.123456Z"
}
```

---

### Lister tous les Clients

**Endpoint** : `GET /api/clients/`

**Paramètres de Query** :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `skip` | integer | 0 | Nombre de clients à ignorer (pagination) |
| `limit` | integer | 100 | Nombre maximum de clients à retourner |

---

### Obtenir un Client

**Endpoint** : `GET /api/clients/{client_id}`

**Paramètres de Path** :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `client_id` | string | ID unique du client |

---

### Mettre à Jour un Client

**Endpoint** : `PATCH /api/clients/{client_id}`

**Authentification** : ✅ Requise

**Body** (tous les champs optionnels) :

```json
{
  "name": "Ma Boutique E-commerce v2",
  "max_sessions": 20,
  "messages_per_second": 10
}
```

---

### Supprimer un Client

**Endpoint** : `DELETE /api/clients/{client_id}`

**Authentification** : ✅ Requise

**Réponse** (204 No Content)

---

## Gestion des Sessions

### Créer une Session

**Endpoint** : `POST /api/session/create`

**Authentification** : ✅ Requise

**Body** :

```json
{
  "client_id": "client_a3ee05324981",
  "session_label": "support-client"
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `client_id` | string | ✅ | ID du client |
| `session_label` | string | ✅ | Label unique pour la session |

**Réponse** (201 Created) :

```json
{
  "id": "sess_f9f4f07b759d",
  "client_id": "client_a3ee05324981",
  "session_label": "support-client",
  "phone_number": null,
  "status": "AWAITING_LOGIN",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "messages_sent": 0,
  "messages_received": 0,
  "created_at": "2025-11-17T21:36:15.123456Z"
}
```

**Statuts possibles** :

| Statut | Description |
|--------|-------------|
| `AWAITING_LOGIN` | En attente de connexion WhatsApp (scanner le QR code) |
| `CONNECTED` | Connecté et prêt à envoyer des messages |
| `DISCONNECTED` | Déconnecté |
| `FAILED` | Erreur lors de la création |

---

### Obtenir le Statut d'une Session

**Endpoint** : `GET /api/session/{session_id}/status`

**Authentification** : ✅ Requise

**Réponse** (200 OK) :

```json
{
  "connected": true,
  "phone_number": "+237600000000",
  "client": "Ma Boutique E-commerce",
  "last_active": "2025-11-17T21:40:00.123456Z",
  "session_health": "stable",
  "messages_today": 42
}
```

---

### Lister toutes les Sessions

**Endpoint** : `GET /api/session/`

**Authentification** : ✅ Requise

---

### Supprimer une Session

**Endpoint** : `DELETE /api/session/{session_id}`

**Authentification** : ✅ Requise

---

## Envoi de Messages

### Envoyer un Message Texte

**Endpoint** : `POST /api/session/{session_id}/send-message`

**Authentification** : ✅ Requise

**Prérequis** : La session doit être **connectée** (statut: `CONNECTED`)

**Body** :

```json
{
  "to": "237600000000",
  "message": "Bonjour ! Votre commande #12345 a été expédiée 📦"
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `to` | string | ✅ | Numéro WhatsApp (format international) |
| `message` | string | ✅ | Contenu du message (max 4096 caractères) |

**Réponse** (200 OK) :

```json
{
  "status": "sent",
  "message_id": "msg_abc123xyz789",
  "timestamp": "2025-11-17T21:45:30.123456Z"
}
```

---

### Envoyer une Image

**Endpoint** : `POST /api/session/{session_id}/send-media`

**Authentification** : ✅ Requise

**Prérequis** : La session doit être **connectée** (statut: `CONNECTED`)

**Body** :

```json
{
  "to": "237600000000",
  "type": "image",
  "url": "https://example.com/product.jpg",
  "caption": "Voici le produit que vous avez commandé 📸"
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `to` | string | ✅ | Numéro WhatsApp |
| `type` | string | ✅ | `image` |
| `url` | string | ✅ | URL publique de l'image |
| `caption` | string | ❌ | Légende (max 1024 caractères) |

**Formats** : JPEG, PNG | **Taille max** : 16 MB

---

### Envoyer une Vidéo

**Endpoint** : `POST /api/session/{session_id}/send-media`

**Authentification** : ✅ Requise

**Prérequis** : La session doit être **connectée** (statut: `CONNECTED`)

**Body** :

```json
{
  "to": "237600000000",
  "type": "video",
  "url": "https://example.com/tutorial.mp4",
  "caption": "Tutoriel d'utilisation 🎥"
}
```

**Formats** : MP4, MOV | **Taille max** : 100 MB | **Durée max** : 5 minutes

---

### Envoyer un Audio

**Endpoint** : `POST /api/session/{session_id}/send-media?test_mode=true`

**Body** :

```json
{
  "to": "237600000000",
  "type": "audio",
  "url": "https://example.com/message.mp3"
}
```

**Formats** : MP3, OGG, WAV | **Taille max** : 16 MB | **Durée max** : 10 minutes

---

### Envoyer un Document

**Endpoint** : `POST /api/session/{session_id}/send-media?test_mode=true`

**Body** :

```json
{
  "to": "237600000000",
  "type": "document",
  "url": "https://example.com/invoice.pdf",
  "filename": "Facture-2025-11-17.pdf"
}
```

**Formats** : PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX | **Taille max** : 100 MB

---

## Codes d'Erreur

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 200 | OK | Requête réussie | - |
| 201 | Created | Ressource créée | - |
| 400 | Bad Request | Données invalides | Vérifiez le format du body |
| 401 | Unauthorized | Clé API invalide | Vérifiez votre Authorization header |
| 404 | Not Found | Ressource non trouvée | Vérifiez l'ID de la ressource |
| 429 | Too Many Requests | Quota dépassé | Attendez avant de réessayer |
| 500 | Internal Server Error | Erreur serveur | Contactez le support |

---

## Limites et Quotas

| Limite | Valeur |
|--------|--------|
| Sessions simultanées | 5 |
| Messages par seconde | 1 |
| Taille du message | 4096 caractères |
| Taille de l'image | 16 MB |
| Taille de la vidéo | 100 MB |
| Taille du document | 100 MB |
| Taille de l'audio | 16 MB |

---

## Exemples Complets

### Python

```python
import requests

BASE_URL = "https://api.whatsflow.io"
API_KEY = "whatsflow_abc123xyz789"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Créer un client
response = requests.post(
    f"{BASE_URL}/api/clients/",
    json={
        "name": "Ma Boutique",
        "email": "contact@maboutique.com",
        "max_sessions": 10,
        "messages_per_second": 5
    },
    headers=headers
)

client = response.json()
client_id = client["id"]

# Créer une session
response = requests.post(
    f"{BASE_URL}/api/session/create",
    json={
        "client_id": client_id,
        "session_label": "support"
    },
    headers=headers
)

session = response.json()
session_id = session["id"]

# Envoyer un message
response = requests.post(
    f"{BASE_URL}/api/session/{session_id}/send-message?test_mode=true",
    json={
        "to": "237600000000",
        "message": "Bonjour ! 🎉"
    },
    headers=headers
)

print(response.json())
```

---

### JavaScript/Node.js

```javascript
const axios = require('axios');

const BASE_URL = "https://api.whatsflow.io";
const API_KEY = "whatsflow_abc123xyz789";

const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};

// Créer un client
const client = await axios.post(`${BASE_URL}/api/clients/`, {
  name: "Ma Boutique",
  email: "contact@maboutique.com",
  max_sessions: 10,
  messages_per_second: 5
}, { headers });

const clientId = client.data.id;

// Créer une session
const session = await axios.post(`${BASE_URL}/api/session/create`, {
  client_id: clientId,
  session_label: "support"
}, { headers });

const sessionId = session.data.id;

// Envoyer un message
const message = await axios.post(
  `${BASE_URL}/api/session/${sessionId}/send-message?test_mode=true`,
  {
    to: "237600000000",
    message: "Bonjour ! 🎉"
  },
  { headers }
);

console.log(message.data);
```

---

## FAQ

### Q: Comment obtenir ma clé API ?
**R:** Créez un client via l'endpoint `POST /api/clients/`. La réponse contient votre clé API.

### Q: Quel format de numéro WhatsApp dois-je utiliser ?
**R:** Format international sans le `+`. Exemple : `237600000000` pour le Cameroun.

### Q: Puis-je envoyer des messages sans scanner le QR code ?
**R:** Oui, utilisez le paramètre `test_mode=true` dans l'URL pour envoyer en mode test.

### Q: Quels formats de fichiers sont supportés ?
**R:** Images (JPEG, PNG), Vidéos (MP4, MOV), Audio (MP3, OGG, WAV), Documents (PDF, DOC, XLS, PPT).

### Q: Quelle est la limite de messages par seconde ?
**R:** Par défaut 1 message/seconde. Vous pouvez l'augmenter dans vos paramètres.

### Q: Comment gérer les erreurs ?
**R:** Vérifiez le code HTTP et le message d'erreur dans la réponse JSON.

### Q: Puis-je recevoir des webhooks ?
**R:** Oui, configurez vos webhooks dans le tableau de bord pour recevoir les événements en temps réel.

---

## Support

Pour toute question ou problème :
- 📧 Email : support@whatsflow.io
- 💬 Chat : https://whatsflow.io/support
- 📞 Téléphone : +237 XXX XXX XXX

---

**Dernière mise à jour** : 17 novembre 2025
