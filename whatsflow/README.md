# 📱 WhatsFlow — API Middleware WhatsApp Business

API middleware conteneurisée pour intégrer WhatsApp Business dans vos applications SaaS.

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+ (pour OpenWA)

### Installation

1. **Cloner le projet**
```bash
git clone https://github.com/yourname/whatsflow.git
cd whatsflow
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

3. **Démarrer les services**
```bash
docker-compose up -d
```

4. **Vérifier le statut**
```bash
curl http://localhost:8000/health
```

## 📚 Documentation

Consultez `documentation.md` pour la documentation complète.

## 🔑 Endpoints principaux

- `POST /api/session/create` - Créer une session WhatsApp
- `POST /api/{session_id}/send-message` - Envoyer un message
- `GET /api/{session_id}/status` - Vérifier l'état d'une session

## 🧪 Tests

```bash
pytest tests/
```

## 📝 Licence

MIT License - Voir LICENSE pour plus de détails.

## 👨‍💻 Auteur

Dipita Parfait - Scalefy Agency
