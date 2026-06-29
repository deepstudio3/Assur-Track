# 🤝 Guide de Contribution - WhatsFlow

Merci de votre intérêt pour contribuer à WhatsFlow ! Ce document vous guidera à travers le processus de contribution.

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Standards de code](#standards-de-code)
- [Processus de développement](#processus-de-développement)
- [Tests](#tests)
- [Documentation](#documentation)

---

## 🤝 Code de conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite :

- Soyez respectueux et inclusif
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est le mieux pour la communauté
- Faites preuve d'empathie envers les autres membres

---

## 💡 Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé
2. Créez une issue avec :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs observé
   - Environnement (OS, version Docker, etc.)
   - Logs pertinents

### Proposer une fonctionnalité

1. Créez une issue pour discuter de la fonctionnalité
2. Attendez l'approbation avant de commencer le développement
3. Suivez les standards de code du projet

### Soumettre une Pull Request

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📝 Standards de code

### Python

- Suivre PEP 8
- Utiliser des type hints
- Documenter les fonctions avec docstrings
- Maximum 88 caractères par ligne (Black formatter)

```python
def send_message(
    session_id: str,
    to_number: str,
    message: str
) -> str:
    """
    Envoyer un message WhatsApp
    
    Args:
        session_id: ID de la session
        to_number: Numéro du destinataire
        message: Contenu du message
    
    Returns:
        ID du message envoyé
    """
    # Implementation
    pass
```

### Commits

Format des messages de commit :

```
type(scope): description courte

Description détaillée (optionnelle)

Fixes #123
```

Types :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Maintenance

Exemples :
```
feat(api): ajouter endpoint pour envoi de médias
fix(session): corriger la reconnexion automatique
docs(readme): mettre à jour les instructions d'installation
```

---

## 🔄 Processus de développement

### 1. Configuration de l'environnement

```bash
# Cloner le projet
git clone https://github.com/yourname/whatsflow.git
cd whatsflow

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# Installer les dépendances
pip install -r requirements.txt

# Copier .env.example
cp .env.example .env
```

### 2. Développement

```bash
# Créer une branche
git checkout -b feature/ma-fonctionnalite

# Développer et tester
docker-compose up -d
pytest

# Formatter le code
black app/
isort app/
```

### 3. Soumettre

```bash
# Commit
git add .
git commit -m "feat(scope): description"

# Push
git push origin feature/ma-fonctionnalite

# Créer une Pull Request sur GitHub
```

---

## 🧪 Tests

### Exécuter les tests

```bash
# Tous les tests
pytest

# Tests spécifiques
pytest tests/test_api.py

# Avec couverture
pytest --cov=app tests/
```

### Écrire des tests

```python
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_create_session():
    """Test de création de session"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/session/create",
            headers={"Authorization": "Bearer test_key"},
            json={"client_id": "test", "session_label": "test"}
        )
        assert response.status_code == 201
```

---

## 📚 Documentation

### Code

- Documenter toutes les fonctions publiques
- Utiliser des docstrings Google style
- Ajouter des commentaires pour la logique complexe

### API

- Mettre à jour les schémas Pydantic
- Documenter les endpoints dans les docstrings
- Ajouter des exemples dans Swagger

### Fichiers Markdown

- README.md : Vue d'ensemble
- QUICKSTART.md : Guide rapide
- documentation.md : Documentation complète
- TODO.md : Tâches à faire

---

## 🎯 Priorités actuelles

Consultez [TODO.md](TODO.md) pour voir les tâches prioritaires.

Les contributions les plus utiles actuellement :

1. **Intégration OpenWA** (Phase 2)
2. **Tests unitaires** (Phase 2)
3. **Documentation** (Toutes phases)
4. **Sécurité** (Phase 3)

---

## 📞 Contact

- **Issues GitHub** : Pour bugs et fonctionnalités
- **Email** : contact@whatsflow.io
- **Discord** : [Lien à venir]

---

## 📜 Licence

En contribuant, vous acceptez que vos contributions soient sous licence MIT.

---

**Merci de contribuer à WhatsFlow ! 🚀**
