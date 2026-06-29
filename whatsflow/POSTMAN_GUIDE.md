# 📋 COLLECTION POSTMAN - ARCHITECTURE OPENWA PERSONNALISÉE

## 🎯 FICHIER CRÉÉ
**Fichier** : `WhatsFlow_OpenWA.postman_collection.json` ✅

## 🚀 ENDPOINTS DISPONIBLES

### **1. API DE BASE**
- **API Health Check** : `GET http://localhost:8001/health`
  - Vérifie que l'API FastAPI est opérationnelle

### **2. GESTION DES CLIENTS**
- **Créer un Client** : `POST http://localhost:8001/api/clients/`
  - Crée un nouveau client avec configuration personnalisée
- **Lister les Clients** : `GET http://localhost:8001/api/clients/`
  - Récupère tous les clients existants

### **3. GESTION DES SESSIONS WHATSAPP**
- **Créer une Session** : `POST http://localhost:8001/api/session/create`
  - Démarre un conteneur Docker individuel avec OpenWA
  - Génère un QR code pour la connexion
- **Statut de Session** : `GET http://localhost:8001/api/session/{session_id}/status`
  - Vérifie si la session est connectée
- **Lister les Sessions** : `GET http://localhost:8001/api/session/`
  - Récupère toutes les sessions actives

### **4. ENVOI DE MESSAGES**
- **Message Texte** : `POST http://localhost:8001/api/session/{session_id}/send-message`
  - Envoie un message texte via WhatsApp
- **Envoyer Média** : `POST http://localhost:8001/api/session/{session_id}/send-media`
  - Supporte : image, vidéo, audio, document

### **5. NETTOYAGE**
- **Supprimer Session** : `DELETE http://localhost:8001/api/session/{session_id}`
  - Arrête et supprime le conteneur Docker

## 🔧 VARIABLES D'ENVIRONNEMENT

La collection utilise des variables à configurer :

- **`api_key`** : Clé API obtenue après création du client
- **`client_id`** : ID du client pour les tests
- **`session_id`** : ID de session WhatsApp
- **`whatsapp_port`** : Port du conteneur WhatsApp (3010-3014)

## 📱 UTILISATION RAPIDE

### **ÉTAPE 1 : Importer dans Postman**
1. Ouvrir Postman
2. File → Import
3. Sélectionner `WhatsFlow_OpenWA.postman_collection.json`

### **ÉTAPE 2 : Configurer les variables**
1. Aller dans l'onglet "Variables" de la collection
2. Mettre à jour les valeurs avec vos données réelles

### **ÉTAPE 3 : Tester l'architecture**
1. **Démarrer l'API** : `./test_openwa_integration.ps1`
2. **Health Check** : Tester que l'API répond
3. **Créer Client** : Obtenir API key et client ID
4. **Créer Session** : Scanner le QR code retourné
5. **Envoyer Messages** : Tester les fonctionnalités

## 🎯 CAS D'UTILISATION

### **Test Complet**
```json
// 1. Créer client
{
    "name": "Test Client OpenWA",
    "email": "test@openwa.com",
    "max_sessions": 5,
    "messages_per_second": 2
}

// 2. Créer session
{
    "client_id": "votre_client_id",
    "session_label": "test-session"
}

// 3. Envoyer message
{
    "to": "237600000000",
    "message": "Test depuis architecture OpenWA !"
}
```

### **Test Direct du Moteur**
La collection inclut aussi des tests directs du moteur WhatsApp :
- `http://localhost:3010/health`
- `http://localhost:3010/status` 
- `http://localhost:3010/qr`

## ⚠️ NOTES IMPORTANTES

- **Ports** : L'architecture utilise les ports 3010-3014 pour les sessions
- **QR Code** : Valide 2 minutes après génération
- **Authentification** : Utilisez l'API key retournée lors de la création du client
- **Isolation** : Chaque session tourne dans son propre conteneur Docker

---

**🚀 Votre collection Postman est prête pour tester l'architecture OpenWA personnalisée !**
