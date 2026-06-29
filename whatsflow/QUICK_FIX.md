# ⚡ Solution rapide - "API key invalide"

## 🎯 Problème
Vous obtenez l'erreur : `{"detail": "API key invalide ou client inactif"}`

## ✅ Solution en 2 étapes

### Étape 1 : Créer un client et obtenir l'API Key

**Option A - Script PowerShell (RECOMMANDÉ)** :
```powershell
.\create_client.ps1
```

**Option B - Swagger UI** :
1. Ouvrez http://localhost:8000/docs
2. Allez sur `/api/clients/` → POST
3. Cliquez "Try it out"
4. Entrez :
```json
{
  "name": "Swift AI",
  "email": "contact@swiftai.com",
  "max_sessions": 10,
  "messages_per_second": 2
}
```
5. Cliquez "Execute"
6. **COPIEZ l'API Key** (format: `wf_live_xxxxxxxxxx`)

**Option C - cURL** :
```bash
curl -X POST "http://localhost:8000/api/clients/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Swift AI",
    "email": "contact@swiftai.com",
    "max_sessions": 10,
    "messages_per_second": 2
  }'
```

### Étape 2 : Utiliser l'API Key

**Dans Swagger UI** :
1. Cliquez sur le cadenas 🔒 en haut à droite
2. Entrez : `Bearer wf_live_xxxxxxxxxx`
3. Cliquez "Authorize"
4. Maintenant tous vos appels seront authentifiés !

**Dans Postman** :
1. Ouvrez la collection WhatsFlow
2. Variables → Modifiez `api_key` avec votre clé
3. Ou ajoutez dans chaque requête :
   - Header: `Authorization`
   - Value: `Bearer wf_live_xxxxxxxxxx`

**Dans cURL** :
```bash
curl -X POST "http://localhost:8000/api/session/create" \
  -H "Authorization: Bearer wf_live_xxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "votre_client_id",
    "session_label": "test"
  }'
```

---

## 🧪 Test complet

```powershell
# 1. Créer le client
.\create_client.ps1

# 2. Copier l'API Key et le client_id affichés

# 3. Tester la création de session (remplacez les valeurs)
curl -X POST "http://localhost:8000/api/session/create" `
  -H "Authorization: Bearer VOTRE_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "client_id": "VOTRE_CLIENT_ID",
    "session_label": "test-session"
  }'
```

---

## 📝 Notes importantes

- ⚠️ **L'API Key est générée une seule fois** - Sauvegardez-la !
- ⚠️ **Un client = Une API Key** - Ne créez pas plusieurs clients inutilement
- ✅ **Le script sauvegarde automatiquement** les credentials dans `client_credentials.json`

---

## 🔄 Si vous avez perdu votre API Key

Vous ne pouvez pas la récupérer. Vous devez :
1. Créer un nouveau client
2. Obtenir une nouvelle API Key
3. Utiliser cette nouvelle clé

---

## 🆘 Toujours bloqué ?

Consultez le guide complet : [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
