# 📁 Structure du Projet WhatsFlow

```
whatsflow/
│
├── app/                          # Code source de l'application
│   ├── __init__.py
│   ├── main.py                   # Point d'entrée FastAPI
│   │
│   ├── api/                      # Routes API
│   │   ├── __init__.py
│   │   ├── dependencies.py       # Dépendances (auth, etc.)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py         # Router principal v1
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── clients.py    # Gestion des clients
│   │           ├── sessions.py   # Gestion des sessions WhatsApp
│   │           └── messages.py   # Envoi/réception de messages
│   │
│   ├── core/                     # Configuration et utilitaires
│   │   ├── __init__.py
│   │   ├── config.py             # Variables d'environnement
│   │   ├── database.py           # Configuration SQLAlchemy
│   │   └── security.py           # JWT, hashing, API keys
│   │
│   ├── models/                   # Modèles SQLAlchemy
│   │   ├── __init__.py
│   │   ├── client.py             # Modèle Client
│   │   ├── session.py            # Modèle Session
│   │   └── message.py            # Modèle Message
│   │
│   ├── schemas/                  # Schémas Pydantic
│   │   ├── __init__.py
│   │   ├── client.py             # Schémas Client
│   │   ├── session.py            # Schémas Session
│   │   └── message.py            # Schémas Message
│   │
│   └── services/                 # Logique métier
│       ├── __init__.py
│       ├── session_manager.py    # Gestion des conteneurs Docker
│       └── message_service.py    # Envoi/réception messages
│
├── scripts/                      # Scripts utilitaires
│   ├── create_test_client.py     # Créer un client de test
│   └── test_api.py               # Script de test de l'API
│
├── tests/                        # Tests unitaires
│   ├── __init__.py
│   └── test_api.py
│
├── .env                          # Variables d'environnement (à créer)
├── .env.example                  # Exemple de variables d'environnement
├── .gitignore                    # Fichiers à ignorer par Git
├── docker-compose.yml            # Configuration Docker Compose
├── Dockerfile                    # Image Docker de l'API
├── requirements.txt              # Dépendances Python
├── pytest.ini                    # Configuration pytest
├── start.sh                      # Script de démarrage (Linux/Mac)
├── start.ps1                     # Script de démarrage (Windows)
├── README.md                     # Documentation principale
├── QUICKSTART.md                 # Guide de démarrage rapide
├── documentation.md              # Documentation complète du projet
├── PROJECT_STRUCTURE.md          # Ce fichier
└── LICENSE                       # Licence MIT
```

## 📦 Composants principaux

### 🔹 API (FastAPI)
- **main.py** : Point d'entrée de l'application
- **api/v1/** : Routes API version 1
- **dependencies.py** : Authentification et validation

### 🔹 Base de données
- **models/** : Modèles SQLAlchemy (ORM)
- **schemas/** : Validation Pydantic
- **core/database.py** : Configuration PostgreSQL

### 🔹 Services
- **session_manager.py** : Gestion des conteneurs Docker WhatsApp
- **message_service.py** : Envoi/réception de messages

### 🔹 Configuration
- **core/config.py** : Gestion des variables d'environnement
- **core/security.py** : JWT, hashing, génération d'API keys

### 🔹 Docker
- **docker-compose.yml** : Orchestration des services (API, PostgreSQL, Redis)
- **Dockerfile** : Image de l'API

## 🗄️ Base de données

### Tables principales

1. **clients**
   - Entreprises utilisant l'API (ex: Swift AI)
   - Contient l'API key et les quotas

2. **sessions**
   - Sessions WhatsApp actives
   - Lien avec les conteneurs Docker

3. **messages**
   - Historique des messages envoyés/reçus
   - Statuts et métadonnées

## 🔄 Flux de données

```
Client (Swift AI)
    ↓
API Gateway (FastAPI)
    ↓
Authentification (JWT/API Key)
    ↓
Session Manager (Docker)
    ↓
Conteneur WhatsApp (OpenWA)
    ↓
WhatsApp / Meta
```

## 🚀 Prochaines étapes

1. ✅ **Phase 1 complétée** : Structure de base et API fonctionnelle
2. 🔜 **Phase 2** : Intégration OpenWA réelle
3. 🔜 **Phase 3** : Sécurité avancée et rate limiting
4. 🔜 **Phase 4** : Dashboard de monitoring
5. 🔜 **Phase 5** : Production et scaling

---

**Version actuelle : 1.0.0 - PHASE 1 (MVP)**
