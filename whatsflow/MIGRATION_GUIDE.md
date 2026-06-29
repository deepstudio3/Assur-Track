# Guide de Migration Manuelle vers Baileys

## ⚠️ Prérequis

**IMPORTANT** : Docker Desktop doit être démarré avant d'exécuter la migration.

### Vérifier que Docker est actif
```powershell
docker ps
```

Si vous obtenez une erreur, démarrez Docker Desktop et attendez qu'il soit complètement initialisé.

---

## 🚀 Étapes de Migration

### Étape 1 : Démarrer Docker Desktop
1. Ouvrir Docker Desktop
2. Attendre que l'icône soit verte
3. Vérifier avec `docker ps`

### Étape 2 : Nettoyer les anciens conteneurs
```powershell
# Lister les conteneurs WhatsApp
docker ps -a | findstr whatsapp_

# Arrêter et supprimer (si existants)
docker stop $(docker ps -a -q --filter "name=whatsapp_")
docker rm $(docker ps -a -q --filter "name=whatsapp_")
```

### Étape 3 : Supprimer l'ancienne image
```powershell
docker rmi -f whatsapp-openwa-engine:latest
```

### Étape 4 : Reconstruire avec Baileys
```powershell
cd "c:\Users\Studio D\Desktop\DASHBOARD SWIFT AI\whatsflow"
docker-compose build --no-cache whatsapp-engine
```

**⏳ Cette étape prend environ 2-3 minutes**

### Étape 5 : Vérifier l'image
```powershell
docker images | findstr baileys
```

Vous devriez voir :
```
whatsapp-baileys-engine   latest   [IMAGE_ID]   [SIZE]
```

### Étape 6 : Redémarrer les services
```powershell
docker-compose down
docker-compose up -d
```

### Étape 7 : Vérifier les services
```powershell
docker-compose ps
```

Tous les services doivent être "Up".

---

## 🧪 Tests

### Test 1 : Health Check API
```powershell
curl http://localhost:8001/health
```

### Test 2 : Créer une session de test
```powershell
python tests\test_baileys_migration.py
```

### Test 3 : Vérifier les logs
```powershell
# Logs de l'API
docker-compose logs -f api

# Logs d'un conteneur WhatsApp (après création)
docker logs whatsapp_<session_id>
```

---

## 📊 Résultats Attendus

### ✅ Succès
- Image `whatsapp-baileys-engine:latest` créée (~200MB)
- Tous les services "Up" dans `docker-compose ps`
- API répond sur http://localhost:8001/health
- QR code généré (non-placeholder, >200 caractères)

### ❌ Échec
Si vous rencontrez des problèmes :

1. **Docker ne démarre pas**
   - Redémarrer Docker Desktop
   - Vérifier les ressources système (RAM, CPU)

2. **Build échoue**
   - Vérifier la connexion Internet
   - Nettoyer le cache : `docker system prune -a`
   - Réessayer le build

3. **Services ne démarrent pas**
   - Vérifier les logs : `docker-compose logs`
   - Vérifier les ports (8001, 5433, 6380)
   - Redémarrer : `docker-compose restart`

---

## 📝 Commandes Utiles

### Logs
```powershell
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Redémarrage
```powershell
# Redémarrer un service
docker-compose restart api

# Redémarrer tous les services
docker-compose restart

# Reconstruire et redémarrer
docker-compose up -d --build
```

### Nettoyage
```powershell
# Arrêter tout
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Nettoyer complètement Docker
docker system prune -a
```

---

## 🎯 Checklist de Validation

- [ ] Docker Desktop démarré
- [ ] Anciens conteneurs arrêtés
- [ ] Ancienne image supprimée
- [ ] Nouvelle image construite (whatsapp-baileys-engine:latest)
- [ ] Services redémarrés
- [ ] API accessible (http://localhost:8001/health)
- [ ] Session créée avec succès
- [ ] QR code généré (non-placeholder)
- [ ] QR code scanné
- [ ] Message de test envoyé

---

## 📞 Support

En cas de problème, consulter :
- `MIGRATION_BAILEYS.md` - Documentation complète
- `whatsapp-engine/README.md` - Documentation du moteur
- `POST-MORTEM_QR_CODE_ANALYSIS.md` - Historique des problèmes

---

**Préparé le** : 2024-12-09  
**Version** : 2.0.0 (Baileys)
