# 🔗 Guide d'Intégration WhatsFlow avec Swift AI

**Date** : 12 Décembre 2025  
**Version** : 1.0  
**Statut** : RECOMMANDATIONS FINALES

---

## 📋 Résumé

Ce document décrit comment intégrer WhatsFlow avec Swift AI en tenant compte des limitations de Baileys.

**Capacités d'Intégration** :
- ✅ Réception de messages WhatsApp
- ✅ Webhooks pour les messages entrants
- ✅ Gestion des sessions WhatsApp
- ❌ Envoi de messages (limitation Baileys)
- ❌ Envoi d'images (limitation Baileys)

---

## 🏗️ Architecture d'Intégration

### Flux de Données

```
┌──────────────────────────────────────────────────────────────┐
│                        Swift AI                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Dashboard utilisateur                               │ │
│  │  • Gestion des conversations                           │ │
│  │  • Traitement des messages reçus                       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    WhatsFlow API                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  GET  /api/session/list                ✅ OK          │ │
│  │  GET  /api/session/{id}/status         ✅ OK          │ │
│  │  POST /api/session/create               ✅ OK          │ │
│  │  POST /api/session/{id}/send-message    ⚠️  FALLBACK   │ │
│  │  POST /api/session/{id}/send-media      ⚠️  FALLBACK   │ │
│  │  POST /webhook/messages                 ✅ OK          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  Baileys Engine                              │
│  ✅ Réception de messages                                    │
│  ❌ Envoi de messages (timeout)                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  WhatsApp Web                                │
│  ✅ Messages entrants                                        │
│  ❌ Messages sortants (limitation du protocole)              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 Endpoints Disponibles pour Swift AI

### 1. Créer une Session WhatsApp

```http
POST /api/session/create
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "client_id": "client_5df61c5e5361",
  "session_label": "swift-ai-session-1"
}

Response:
{
  "id": "sess_600f811215d0",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "status": "awaiting_login",
  "created_at": "2025-12-12T05:00:00Z"
}
```

### 2. Vérifier le Statut d'une Session

```http
GET /api/session/{session_id}/status
Authorization: Bearer {API_KEY}

Response:
{
  "connected": true,
  "phone_number": "+237682731274",
  "client": "Test Client WhatsFlow",
  "last_active": "2025-12-12T05:31:28.510019Z",
  "session_health": "stable",
  "messages_today": 11
}
```

### 3. Lister Toutes les Sessions

```http
GET /api/session/
Authorization: Bearer {API_KEY}

Response:
{
  "sessions": [
    {
      "id": "sess_600f811215d0",
      "status": "connected",
      "label": "swift-ai-session-1",
      "phone_number": "+237682731274",
      "messages_sent": 0,
      "messages_received": 11,
      "last_active": "2025-12-12T05:31:28.510019Z"
    }
  ],
  "total": 1
}
```

### 4. Recevoir les Messages Entrants (Webhook)

```http
POST /webhook/messages
Content-Type: application/json

{
  "session_id": "sess_600f811215d0",
  "from": "+237682731274",
  "message": "Bonjour, comment ça va?",
  "message_type": "text",
  "timestamp": "2025-12-12T05:31:28.510019Z",
  "message_id": "3EB0XXXXXX@s.whatsapp.net"
}
```

### 5. Envoyer un Message (⚠️ Fallback Uniquement)

```http
POST /api/session/{session_id}/send-message
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "to": "+237682731274",
  "message": "Bonjour!"
}

Response:
{
  "message_id": "msg_ab08cedb590e",
  "status": "sent",
  "timestamp": "2025-12-12T05:31:28.510019Z"
}

⚠️ NOTE: Le message n'est PAS réellement envoyé à WhatsApp
         L'ID est généré localement (fallback mechanism)
```

### 6. Envoyer une Image (⚠️ Fallback Uniquement)

```http
POST /api/session/{session_id}/send-media
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "to": "+237682731274",
  "type": "image",
  "url": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "caption": "Voici une image"
}

Response:
{
  "message_id": "msg_bd54fddf073f",
  "status": "sent",
  "timestamp": "2025-12-12T05:31:28.510019Z"
}

⚠️ NOTE: L'image n'est PAS réellement envoyée à WhatsApp
         L'ID est généré localement (fallback mechanism)
```

---

## 🔄 Flux d'Intégration Recommandé

### Scénario 1 : Réception de Messages

```
1. Swift AI crée une session WhatsApp
   POST /api/session/create
   
2. Utilisateur scanne le QR code avec son téléphone
   
3. Session devient "connected"
   GET /api/session/{id}/status → connected: true
   
4. Messages entrants sont reçus
   Webhook POST /webhook/messages
   
5. Swift AI traite les messages
   • Stocke en base de données
   • Envoie des notifications
   • Génère des réponses IA
   
6. ⚠️ Pour répondre, utiliser une autre solution
   (WhatsApp Business API, Twilio, etc.)
```

### Scénario 2 : Gestion des Sessions

```
1. Swift AI affiche la liste des sessions
   GET /api/session/
   
2. Affiche le statut de chaque session
   GET /api/session/{id}/status
   
3. Permet de créer de nouvelles sessions
   POST /api/session/create
   
4. Affiche les statistiques
   • Messages reçus
   • Dernière activité
   • Santé de la session
```

---

## 🛠️ Configuration pour Swift AI

### Variables d'Environnement

```bash
# WhatsFlow API
WHATSFLOW_API_URL=http://localhost:8001
WHATSFLOW_API_KEY=qzkzSeyrm88vi8A0cvRwyt9fTpWx9qGwFpOujYGKF-s

# Webhook
WEBHOOK_URL=http://swift-ai:5000/webhooks/whatsapp
WEBHOOK_SECRET=your-secret-key

# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/whatsflow
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=INFO
```

### Code d'Intégration (Python)

```python
import requests
import asyncio
from typing import Optional, Dict, List

class WhatsFlowClient:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_sessions(self) -> List[Dict]:
        """Récupérer toutes les sessions"""
        response = requests.get(
            f"{self.api_url}/api/session/",
            headers=self.headers
        )
        return response.json()["sessions"]
    
    async def get_session_status(self, session_id: str) -> Dict:
        """Vérifier le statut d'une session"""
        response = requests.get(
            f"{self.api_url}/api/session/{session_id}/status",
            headers=self.headers
        )
        return response.json()
    
    async def create_session(self, label: str) -> Dict:
        """Créer une nouvelle session"""
        response = requests.post(
            f"{self.api_url}/api/session/create",
            headers=self.headers,
            json={"session_label": label}
        )
        return response.json()
    
    async def send_message(self, session_id: str, to: str, message: str) -> Dict:
        """⚠️ Envoyer un message (fallback uniquement)"""
        response = requests.post(
            f"{self.api_url}/api/session/{session_id}/send-message",
            headers=self.headers,
            json={"to": to, "message": message}
        )
        return response.json()
    
    async def handle_webhook(self, data: Dict) -> None:
        """Traiter un message entrant"""
        session_id = data.get("session_id")
        from_number = data.get("from")
        message = data.get("message")
        
        # Traiter le message
        print(f"Message reçu de {from_number}: {message}")
        
        # Intégrer avec Swift AI
        # await swift_ai.process_message(from_number, message)

# Utilisation
client = WhatsFlowClient(
    api_url="http://localhost:8001",
    api_key="qzkzSeyrm88vi8A0cvRwyt9fTpWx9qGwFpOujYGKF-s"
)

# Récupérer les sessions
sessions = asyncio.run(client.get_sessions())
print(f"Sessions: {sessions}")

# Vérifier le statut
status = asyncio.run(client.get_session_status("sess_600f811215d0"))
print(f"Statut: {status}")
```

---

## ⚠️ Limitations à Communiquer aux Utilisateurs

### Message pour l'Interface Utilisateur

```
🔔 IMPORTANT - Limitations de WhatsFlow

WhatsFlow est capable de :
✅ Recevoir les messages WhatsApp
✅ Afficher l'historique des conversations
✅ Gérer les sessions WhatsApp

WhatsFlow N'EST PAS capable de :
❌ Envoyer des messages WhatsApp
❌ Envoyer des images ou fichiers
❌ Envoyer des messages automatiques

Pour envoyer des messages, veuillez utiliser :
• WhatsApp Business API (solution officielle)
• Twilio WhatsApp (solution tierce)
• Répondre directement depuis votre téléphone
```

---

## 🔐 Sécurité

### Authentification

- ✅ Bearer Token dans les headers
- ✅ API Key stockée en base de données
- ✅ Validation des requêtes
- ✅ Rate limiting (2 messages/seconde par client)

### Données Sensibles

- ✅ Numéros de téléphone chiffrés en base de données
- ✅ Sessions isolées par client
- ✅ Logs sans données sensibles
- ✅ Webhooks sécurisés avec signature

### Recommandations

1. **Utiliser HTTPS** en production
2. **Changer les API Keys** régulièrement
3. **Implémenter le rate limiting** côté Swift AI
4. **Valider les webhooks** avec une signature
5. **Chiffrer les données sensibles** en transit

---

## 📊 Monitoring et Logs

### Logs Importants

```
✅ Session créée: sess_600f811215d0
✅ Session connectée: sess_600f811215d0
✅ Message reçu: +237682731274 → "Bonjour"
❌ Erreur d'envoi: Timed Out (fallback utilisé)
⚠️ Session déconnectée: sess_600f811215d0
```

### Métriques à Monitorer

```
• Nombre de sessions actives
• Messages reçus par jour
• Tentatives d'envoi (fallback)
• Uptime de l'API
• Latence des webhooks
• Erreurs de connexion Baileys
```

---

## 🚀 Déploiement en Production

### Checklist

- [ ] Tester tous les endpoints
- [ ] Configurer les webhooks
- [ ] Implémenter le monitoring
- [ ] Configurer les logs
- [ ] Tester la réception de messages
- [ ] Documenter les limitations
- [ ] Former les utilisateurs
- [ ] Mettre en place le support
- [ ] Implémenter une solution d'envoi alternative
- [ ] Configurer les backups

### Alternatives pour l'Envoi

#### WhatsApp Business API (Recommandé)

```
Avantages:
✅ Solution officielle WhatsApp
✅ Support complet
✅ Fiable et stable
✅ Intégration facile

Inconvénients:
❌ Coûteux (0.05$ par message)
❌ Processus d'approbation long
❌ Complexité administrative

Intégration:
POST https://graph.instagram.com/v18.0/{phone-number-id}/messages
```

#### Twilio WhatsApp

```
Avantages:
✅ API bien documentée
✅ Support excellent
✅ Fiable et stable
✅ Intégration facile

Inconvénients:
❌ Coûteux
❌ Dépendance à un tiers

Intégration:
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages
```

---

## 📞 Support

Pour les questions ou problèmes :

1. **Vérifier les logs** : `docker logs whatsflow_api`
2. **Vérifier le statut** : `GET /api/session/{id}/status`
3. **Consulter la documentation** : `http://localhost:8001/docs`
4. **Contacter le support** : support@whatsflow.local

---

## 📝 Conclusion

WhatsFlow est **prêt pour l'intégration avec Swift AI** avec les limitations suivantes :

✅ **Utiliser pour** :
- Réception de messages WhatsApp
- Gestion des sessions
- Webhooks pour les messages entrants
- Intégration avec IA pour traitement

❌ **Ne pas utiliser pour** :
- Envoi de messages (utiliser WhatsApp Business API)
- Envoi d'images (utiliser WhatsApp Business API)
- Envoi automatique (utiliser une solution alternative)

**Prochaines étapes** :
1. Intégrer les webhooks dans Swift AI
2. Implémenter le traitement des messages
3. Ajouter une solution d'envoi alternative
4. Tester en production
5. Former les utilisateurs

---

**Document généré** : 12 Décembre 2025  
**Version** : 1.0  
**Statut** : FINAL
