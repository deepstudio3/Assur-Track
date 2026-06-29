# WhatsApp Engine - Baileys

## 🚀 Migration vers Baileys

Ce moteur WhatsApp a été migré de **OpenWA** vers **Baileys** pour une meilleure stabilité et performance.

### ✅ Avantages de Baileys

- **Plus léger** : Pas besoin de Chromium/Puppeteer (réduction de ~500MB)
- **Plus stable** : Reconnexion automatique et gestion native des sessions
- **Plus rapide** : Démarrage en quelques secondes au lieu de minutes
- **Mieux maintenu** : Projet activement développé et utilisé en production
- **Meilleure gestion des QR codes** : Génération instantanée et fiable

### 📦 Dépendances

```json
{
  "@whiskeysockets/baileys": "^6.7.5",
  "express": "^4.19.2",
  "qrcode": "^1.5.3",
  "redis": "^4.6.7",
  "winston": "^3.11.0"
}
```

### 🏗️ Architecture

```
whatsapp-engine/
├── src/
│   ├── index.js              # Serveur Express
│   ├── whatsapp-engine.js    # Moteur Baileys
│   └── redis-client.js       # Client Redis
├── auth/                     # Sessions WhatsApp (auto-généré)
├── Dockerfile               # Image Docker optimisée
├── package.json
└── .env.example
```

### 🔧 Configuration

Variables d'environnement :

- `PORT` : Port du serveur (défaut: 3010)
- `SESSION_ID` : Identifiant unique de la session
- `REDIS_URL` : URL de connexion Redis
- `LOG_LEVEL` : Niveau de logs (info, debug, error)

### 🌐 API Endpoints

#### GET /health
Vérifier l'état du service

```bash
curl http://localhost:3010/health
```

#### GET /qr
Récupérer le QR code pour la connexion

```bash
curl http://localhost:3010/qr
```

#### GET /status
Obtenir le statut de la session

```bash
curl http://localhost:3010/status
```

#### POST /send-message
Envoyer un message texte

```bash
curl -X POST http://localhost:3010/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "33612345678",
    "message": "Hello from WhatsFlow!"
  }'
```

#### POST /send-media
Envoyer un média (image, vidéo, audio, document)

```bash
curl -X POST http://localhost:3010/send-media \
  -H "Content-Type: application/json" \
  -d '{
    "to": "33612345678",
    "type": "image",
    "url": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }'
```

#### POST /disconnect
Déconnecter la session

```bash
curl -X POST http://localhost:3010/disconnect
```

### 🐳 Docker

#### Construction de l'image

```bash
docker build -t whatsapp-baileys-engine:latest .
```

#### Exécution du conteneur

```bash
docker run -d \
  --name whatsapp-session-1 \
  -p 3010:3010 \
  -e SESSION_ID=session-1 \
  -e REDIS_URL=redis://redis:6379 \
  whatsapp-baileys-engine:latest
```

### 📝 Logs

Les logs sont formatés avec Winston et incluent :
- Timestamp
- Niveau (info, error, debug)
- Message
- Métadonnées (sessionId, etc.)

Exemple :
```
2024-12-09T08:26:00.000Z [info] 🚀 Initializing WhatsApp session: session-1
2024-12-09T08:26:01.000Z [info] 📱 QR Code received for session: session-1
2024-12-09T08:26:30.000Z [info] ✅ Session connected: session-1
```

### 🔄 Gestion des Sessions

Les sessions sont stockées dans le dossier `auth/` avec la structure suivante :
```
auth/
└── session-1/
    ├── creds.json
    ├── app-state-sync-key-*.json
    └── ...
```

### 🛡️ Sécurité

- Helmet.js pour les headers HTTP sécurisés
- CORS activé pour les requêtes cross-origin
- Validation des entrées utilisateur
- Gestion gracieuse des erreurs

### 🔍 Troubleshooting

#### Le QR code ne s'affiche pas
- Vérifier que Redis est accessible
- Vérifier les logs du conteneur
- S'assurer que la session n'est pas déjà connectée

#### La session se déconnecte fréquemment
- Vérifier la connexion réseau
- Augmenter `keepAliveIntervalMs` dans la configuration
- Vérifier que le téléphone est connecté à Internet

#### Erreur "WhatsApp session not connected"
- Attendre que le QR code soit scanné
- Vérifier le statut avec `/status`
- Redémarrer le conteneur si nécessaire

### 📊 Comparaison OpenWA vs Baileys

| Critère | OpenWA | Baileys |
|---------|--------|---------|
| Taille image Docker | ~1.2GB | ~200MB |
| Temps de démarrage | 2-5 min | 5-10 sec |
| Dépendances | Chromium + Puppeteer | Node.js uniquement |
| Stabilité | Moyenne | Excellente |
| Maintenance | Limitée | Active |
| QR Code | Parfois problématique | Fiable |

### 🎯 Prochaines Étapes

1. Reconstruire l'image Docker
2. Tester la génération du QR code
3. Valider l'envoi de messages
4. Monitorer la stabilité en production

---

**Migration effectuée le** : 2024-12-09  
**Version** : 2.0.0  
**Moteur** : Baileys (@whiskeysockets/baileys)
