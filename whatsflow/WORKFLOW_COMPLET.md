# 🚀 Workflow Complet WhatsFlow - Créer Client, Session et Tester Messages

## 📋 Étapes du Workflow

### Étape 1 : Créer un nouveau client
**Requête Postman** : `👤 Clients -> Créer un client`

1. Modifie le body avec des données **uniques** :
```json
{
  "name": "Test Client [TIMESTAMP]",
  "email": "test[TIMESTAMP]@example.com",
  "description": "Client de test pour WhatsApp",
  "max_sessions": 10,
  "messages_per_second": 5
}
```

2. Clique sur **Send**
3. La réponse contient :
   - `id` : ID du client (ex: `client_xxx`)
   - `api_key` : Clé API (ex: `whatsflow_xxx`)
4. Ces valeurs sont **automatiquement** sauvegardées dans les variables Postman :
   - `client_id`
   - `api_key`

---

### Étape 2 : Créer une session WhatsApp
**Requête Postman** : `📱 Sessions WhatsApp -> Créer une session`

1. Clique sur **Send**
2. La réponse contient :
   - `id` : ID de la session (ex: `sess_xxx`)
   - `qr_code` : QR code en base64 pour se connecter avec WhatsApp
   - `status` : `AWAITING_LOGIN`
3. Le `session_id` est **automatiquement** sauvegardé dans les variables Postman

---

### Étape 3 : Afficher le QR Code
**Requête Postman** : `📱 Sessions WhatsApp -> Créer une session`

1. Après avoir créé une session, regarde la réponse JSON
2. Copie la valeur du champ `qr_code` (commence par `data:image/png;base64,`)
3. Ouvre un onglet dans ton navigateur et colle dans la barre d'adresse :
   ```
   data:image/png;base64,[COLLE_LA_VALEUR_ICI]
   ```
4. Le QR code s'affichera
5. Scanne-le avec ton téléphone WhatsApp pour te connecter

---

### Étape 4 : Vérifier le statut de la session
**Requête Postman** : `📱 Sessions WhatsApp -> Obtenir le statut d'une session`

1. Clique sur **Send**
2. Vérifie que le statut passe de `AWAITING_LOGIN` à `CONNECTED` après avoir scanné le QR code

---

### Étape 5 : Envoyer un message texte
**Requête Postman** : `💬 Messages -> Envoyer un message texte`

1. Modifie le body :
```json
{
  "to": "237XXXXXXXXX",
  "message": "Bonjour ! Ceci est un test depuis WhatsFlow 🚀"
}
```
(Remplace `237XXXXXXXXX` par un numéro WhatsApp valide)

2. Ajoute le paramètre de query `test_mode=true` pour envoyer même si la session n'est pas connectée :
   - URL : `{{base_url}}/api/session/{{session_id}}/send-message?test_mode=true`

3. Clique sur **Send**

---

### Étape 6 : Envoyer une image
**Requête Postman** : `💬 Messages -> Envoyer une image`

1. Modifie le body :
```json
{
  "to": "237XXXXXXXXX",
  "type": "image",
  "url": "https://via.placeholder.com/300x300?text=Test+Image",
  "caption": "Voici une image de test 📸"
}
```

2. Ajoute le paramètre `test_mode=true` à l'URL

3. Clique sur **Send**

---

### Étape 7 : Envoyer un audio
**Requête Postman** : `💬 Messages -> Envoyer un audio`

1. Modifie le body :
```json
{
  "to": "237XXXXXXXXX",
  "type": "audio",
  "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
}
```

2. Ajoute le paramètre `test_mode=true` à l'URL

3. Clique sur **Send**

---

### Étape 8 : Envoyer un document
**Requête Postman** : `💬 Messages -> Envoyer un document`

1. Modifie le body :
```json
{
  "to": "237XXXXXXXXX",
  "type": "document",
  "url": "https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf_files/table.pdf",
  "filename": "Document-Test.pdf"
}
```

2. Ajoute le paramètre `test_mode=true` à l'URL

3. Clique sur **Send**

---

## 🔑 Variables Postman Utilisées

| Variable | Description | Exemple |
|----------|-------------|---------|
| `base_url` | URL de base de l'API | `http://localhost:8001` |
| `api_key` | Clé API du client | `whatsflow_xxx` |
| `client_id` | ID du client | `client_xxx` |
| `session_id` | ID de la session | `sess_xxx` |

---

## 📱 Numéros de Test

Pour tester l'envoi de messages, utilise un numéro WhatsApp valide au format international :
- Format : `[CODE_PAYS][NUMÉRO]`
- Exemples :
  - Cameroun : `237XXXXXXXXX`
  - France : `33XXXXXXXXX`
  - USA : `1XXXXXXXXXX`

---

## ✅ Checklist Complète

- [ ] Créer un client avec des données uniques
- [ ] Vérifier que `api_key` et `client_id` sont remplis dans les variables Postman
- [ ] Créer une session
- [ ] Vérifier que `session_id` est rempli dans les variables Postman
- [ ] Afficher le QR code et scanner avec WhatsApp
- [ ] Vérifier le statut de la session (doit passer à `CONNECTED`)
- [ ] Envoyer un message texte
- [ ] Envoyer une image
- [ ] Envoyer un audio
- [ ] Envoyer un document
- [ ] Vérifier les messages reçus sur WhatsApp

---

## 🐛 Dépannage

### Erreur : "API key invalide ou client inactif"
- Vérifie que `api_key` dans les variables Postman n'est pas `YOUR_API_KEY_HERE`
- Crée un nouveau client avec des données uniques

### Erreur : "Session non trouvée"
- Vérifie que `session_id` est bien rempli dans les variables Postman
- Crée une nouvelle session

### Erreur : "La session n'est pas connectée"
- Ajoute le paramètre `test_mode=true` à l'URL pour envoyer en mode test
- Ou scanne le QR code pour connecter la session

### Le QR code ne s'affiche pas
- Copie la valeur du champ `qr_code` depuis la réponse JSON
- Ouvre un nouvel onglet et colle dans la barre d'adresse : `data:image/png;base64,[VALEUR]`

---

## 📚 Ressources

- **Documentation FastAPI** : http://localhost:8001/docs
- **Swagger UI** : http://localhost:8001/redoc
- **Collection Postman** : `WhatsFlow.postman_collection.json`

