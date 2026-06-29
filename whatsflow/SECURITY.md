# 🔒 Guide de Sécurité - WhatsFlow

Ce document décrit les pratiques de sécurité implémentées dans WhatsFlow et les recommandations pour un déploiement sécurisé.

---

## 🛡️ Sécurité implémentée (PHASE 1)

### Authentification

✅ **API Key sécurisée**
- Génération via `secrets.token_urlsafe(32)`
- Stockage en base de données
- Validation sur chaque requête

✅ **JWT Support**
- Algorithme HS256
- Expiration configurable
- Secret key dans variables d'environnement

✅ **Bearer Token**
- Format standard : `Authorization: Bearer <api_key>`
- Validation middleware FastAPI

### Validation des données

✅ **Pydantic Schemas**
- Validation stricte de tous les inputs
- Type checking automatique
- Sanitization des champs

✅ **SQLAlchemy ORM**
- Protection contre les injections SQL
- Requêtes paramétrées

### Hashing

✅ **bcrypt**
- Hashing sécurisé des mots de passe
- Salt automatique
- Cost factor configurable

### Infrastructure

✅ **Isolation Docker**
- Conteneurs séparés par service
- Réseau interne isolé
- Volumes persistants sécurisés

✅ **Variables d'environnement**
- Secrets stockés dans `.env`
- `.env` dans `.gitignore`
- `.env.example` sans valeurs sensibles

---

## ⚠️ Recommandations de sécurité

### En développement

```bash
# .env pour développement
JWT_SECRET=dev_secret_key_change_in_production
POSTGRES_PASSWORD=dev_password
ENVIRONMENT=development
```

### En production

```bash
# .env pour production
JWT_SECRET=<générer une clé forte de 64+ caractères>
POSTGRES_PASSWORD=<mot de passe fort et unique>
ENVIRONMENT=production
API_BASE_URL=https://api.whatsflow.io
```

**Générer un secret JWT fort :**
```python
import secrets
print(secrets.token_urlsafe(64))
```

---

## 🔐 Checklist de sécurité production

### Avant le déploiement

- [ ] Changer tous les secrets par défaut
- [ ] Utiliser des mots de passe forts (20+ caractères)
- [ ] Activer HTTPS (TLS 1.3)
- [ ] Configurer un reverse proxy (Nginx)
- [ ] Limiter les origines CORS
- [ ] Désactiver le mode debug
- [ ] Configurer les logs sécurisés
- [ ] Mettre en place des backups automatiques
- [ ] Activer le monitoring
- [ ] Configurer des alertes de sécurité

### Configuration HTTPS (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.whatsflow.io;

    ssl_certificate /etc/letsencrypt/live/api.whatsflow.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.whatsflow.io/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### CORS en production

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dashboard.whatsflow.io",
        "https://swiftai.com"
    ],  # Domaines autorisés uniquement
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

---

## 🚨 Vulnérabilités à éviter

### ❌ Ne JAMAIS faire

1. **Exposer les secrets**
   ```python
   # ❌ MAUVAIS
   API_KEY = "hardcoded_key_123"
   
   # ✅ BON
   API_KEY = os.getenv("API_KEY")
   ```

2. **Stocker des mots de passe en clair**
   ```python
   # ❌ MAUVAIS
   password = "password123"
   
   # ✅ BON
   from app.core.security import hash_password
   hashed = hash_password("password123")
   ```

3. **Accepter toutes les origines CORS**
   ```python
   # ❌ MAUVAIS (en production)
   allow_origins=["*"]
   
   # ✅ BON
   allow_origins=["https://trusted-domain.com"]
   ```

4. **Logs avec données sensibles**
   ```python
   # ❌ MAUVAIS
   logger.info(f"API Key: {api_key}")
   
   # ✅ BON
   logger.info(f"API Key: {api_key[:8]}...")
   ```

---

## 🔒 Sécurité WhatsApp (Anti-ban)

### Pratiques recommandées

✅ **Warm-up des nouveaux comptes**
- Jour 1-3 : 10-20 messages/jour
- Jour 4-7 : 50-100 messages/jour
- Semaine 2+ : Volume normal

✅ **Rate limiting**
- Maximum 1 message/seconde par session
- Pause de 2-3 secondes entre messages
- Éviter les envois massifs

✅ **Contenu**
- Éviter les mots-clés spam
- Varier les messages
- Personnaliser le contenu
- Utiliser des templates approuvés

✅ **Comportement naturel**
- Simuler des pauses humaines
- Répondre aux messages entrants
- Éviter les patterns répétitifs

### Filtrage de contenu

```python
# Liste de mots interdits (à implémenter)
SPAM_KEYWORDS = [
    "gratuit", "urgent", "cliquez ici",
    "gagnez", "promotion limitée", "offre exclusive"
]

def is_spam(message: str) -> bool:
    """Détecter le contenu spam"""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in SPAM_KEYWORDS)
```

---

## 🔍 Audit et monitoring

### Logs de sécurité

```python
# Événements à logger
- Tentatives d'authentification échouées
- Création/suppression de sessions
- Changements de configuration
- Erreurs d'API
- Activités suspectes
```

### Métriques à surveiller

```
- Nombre de requêtes par client
- Taux d'erreurs 401/403
- Temps de réponse anormaux
- Pics de trafic inhabituels
- Sessions créées/supprimées
```

### Alertes automatiques

```yaml
# Exemples d'alertes
- Plus de 10 erreurs 401 en 1 minute
- Plus de 100 messages/minute par session
- Création de plus de 5 sessions en 1 minute
- Erreurs de base de données
- Conteneurs Docker crashés
```

---

## 🛠️ Outils de sécurité recommandés

### Scan de vulnérabilités

```bash
# Python
pip install safety
safety check

# Docker
docker scan whatsflow_api

# Dépendances
pip-audit
```

### Tests de sécurité

```bash
# OWASP ZAP
# Burp Suite
# Postman Security Tests
```

---

## 📋 Checklist de sécurité mensuelle

- [ ] Mettre à jour les dépendances
- [ ] Vérifier les logs d'erreurs
- [ ] Analyser les patterns d'utilisation
- [ ] Tester les backups
- [ ] Vérifier les certificats SSL
- [ ] Auditer les accès API
- [ ] Revoir les quotas clients
- [ ] Vérifier l'intégrité des données

---

## 🚨 Signaler une vulnérabilité

Si vous découvrez une vulnérabilité de sécurité :

1. **NE PAS** créer d'issue publique
2. Envoyer un email à : security@whatsflow.io
3. Inclure :
   - Description de la vulnérabilité
   - Étapes pour reproduire
   - Impact potentiel
   - Suggestions de correction (optionnel)

**Délai de réponse : 48 heures**

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)

---

## 🔄 Mises à jour de sécurité

Ce document est mis à jour régulièrement. Dernière révision : **11 novembre 2025**

---

**La sécurité est une responsabilité partagée. Restez vigilant ! 🛡️**
