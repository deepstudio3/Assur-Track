# Instructions de Déploiement OpenWA Personnalisé

## 🔧 ÉTAPE PRÉREQUIS : Démarrer Docker Desktop

1. **Ouvrir Docker Desktop** depuis le menu Démarrer
2. **Attendre le démarrage complet** (icône verte dans la barre des tâches)
3. **Vérifier** que Docker est opérationnel

## 🚀 COMMANDE DE DÉPLOIEMENT

Une fois Docker démarré, exécutez :

```bash
# PowerShell (recommandé)
./test_openwa_integration.ps1

# Ou manuellement :
cd whatsapp-engine
docker build -t whatsapp-openwa-engine:latest .
cd ..
docker-compose up --build -d
```

## 📊 Vérification des Ports

Ports déjà vérifiés et disponibles :
- ✅ 8001 : API FastAPI
- ✅ 6380 : Redis externe  
- ✅ 3010-3014 : Sessions WhatsApp
- ❌ 3000 : Frontend (évité)
- ❌ 5432 : PostgreSQL (existant)
- ❌ 6379 : Redis (existant)

## 🎯 Accès après Déploiement

- 🌐 API : http://localhost:8001
- 📚 Documentation : http://localhost:8001/docs
- 📱 Sessions WhatsApp : Ports 3010-3014

---

**DÉMARREZ DOCKER DESKTOP PUIS LANCEZ LE DÉPLOIEMENT !** 🚀
