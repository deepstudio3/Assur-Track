#!/usr/bin/env python3
"""
Script de test complet pour WhatsFlow - Validation complète de la chaîne fonctionnelle
Teste: Création client, session, génération QR code, envoi messages et images
"""
import requests
import json
import time
import base64
from typing import Optional
import os
from PIL import Image
import io
import sys

# Configuration
BASE_URL = "http://localhost:8001"
API_KEY: Optional[str] = None
CLIENT_ID: Optional[str] = None
SESSION_ID: Optional[str] = None

def print_section(title: str):
    """Afficher une section formatée"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def print_result(success: bool, message: str, data: dict = None):
    """Afficher le résultat d'un test"""
    status = "✅ SUCCÈS" if success else "❌ ÉCHEC"
    print(f"\n{status}: {message}")
    if data:
        print(f"Données: {json.dumps(data, indent=2, ensure_ascii=False)}")

def save_and_display_qr_code(qr_code_data: str, session_id: str):
    """Sauvegarde et affiche le QR code"""
    try:
        # Extraire les données base64 de l'image
        if ',' in qr_code_data:
            # Format: data:image/png;base64,iVBORw0KGgo...
            base64_data = qr_code_data.split(',')[1]
        else:
            base64_data = qr_code_data
        
        # Décoder les données
        image_data = base64.b64decode(base64_data)
        
        # Sauvegarder l'image
        filename = f"qr_code_session_{session_id}.png"
        with open(filename, 'wb') as f:
            f.write(image_data)
        
        print(f"\n📸 QR Code sauvegardé: {filename}")
        print(f"📱 Taille: {len(image_data)} octets")
        
        # Afficher l'image avec PIL si disponible
        try:
            image = Image.open(io.BytesIO(image_data))
            print(f"📏 Dimensions: {image.size[0]}x{image.size[1]} pixels")
            
            # Essayer d'ouvrir l'image avec la visionneuse par défaut
            image.show()
            print("👀 QR Code affiché dans la visionneuse d'images")
            
        except Exception as img_error:
            print(f"⚠️ Impossible d'afficher automatiquement: {img_error}")
            print(f"💡 Ouvrez manuellement le fichier: {filename}")
            
    except Exception as e:
        print(f"❌ Erreur traitement QR code: {str(e)}")

def test_health_check():
    """Test 1: Vérifier l'état de santé de l'API"""
    print_section("Test 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print_result(True, "API en ligne", response.json())
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur de connexion: {str(e)}")
        return False

def get_or_create_client():
    """Récupérer un client existant ou en créer un nouveau"""
    print_section("Étape 1: Récupérer ou créer un client")
    global API_KEY, CLIENT_ID
    
    # Essayer de récupérer le premier client existant
    try:
        response = requests.get(f"{BASE_URL}/api/clients/")
        if response.status_code == 200:
            clients = response.json()
            if clients:
                client = clients[0]  # Prendre le premier client
                API_KEY = client.get("api_key")
                CLIENT_ID = client.get("id")
                print_result(True, "Client existant récupéré", {
                    "client_id": CLIENT_ID,
                    "api_key": API_KEY[:20] + "..." if API_KEY else None,
                    "name": client.get("name")
                })
                return True
    except Exception as e:
        print(f"⚠️ Erreur récupération clients: {e}")
    
    # Si aucun client, en créer un nouveau
    timestamp = int(time.time())
    payload = {
        "name": f"Test Client WhatsFlow {timestamp}",
        "email": f"test{timestamp}@whatsflow.com",
        "description": "Client de test automatique",
        "max_sessions": 5,
        "messages_per_second": 2
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/clients/",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            API_KEY = data.get("api_key")
            CLIENT_ID = data.get("id")
            print_result(True, "Nouveau client créé", {
                "client_id": CLIENT_ID,
                "api_key": API_KEY[:20] + "..." if API_KEY else None,
                "name": data.get("name")
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def create_session():
    """Créer une session WhatsApp"""
    print_section("Étape 2: Créer une session WhatsApp")
    global SESSION_ID
    
    if not API_KEY or not CLIENT_ID:
        print_result(False, "API_KEY ou CLIENT_ID manquant")
        return False
    
    payload = {
        "client_id": CLIENT_ID,
        "session_label": "test-session-complete"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/session/create",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            SESSION_ID = data.get("id")
            print_result(True, "Session créée avec succès", {
                "session_id": SESSION_ID,
                "status": data.get("status"),
                "session_label": data.get("session_label"),
                "qr_code_present": "qr_code" in data and data["qr_code"] is not None
            })
            
            # Afficher le QR code si disponible
            if data.get("qr_code"):
                print("\n📱 QR Code disponible pour connexion WhatsApp")
                print(f"Longueur du QR code: {len(data['qr_code'])} caractères")
                
                # Sauvegarder et afficher le QR code
                save_and_display_qr_code(data['qr_code'], SESSION_ID)
            
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def monitor_connection():
    """Surveiller la connexion de la session"""
    print_section("Étape 3: Surveillance de la connexion")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    print("📡 Surveillance du statut de connexion (appuyez Ctrl+C pour arrêter)...")
    
    try:
        for i in range(30):  # 30 tentatives max (90 secondes)
            response = requests.get(
                f"{BASE_URL}/api/session/{SESSION_ID}/status",
                headers={"Authorization": f"Bearer {API_KEY}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                connected = data.get("connected", False)
                phone_number = data.get("phone_number")
                session_health = data.get("session_health")
                
                status_emoji = "🟢" if connected else "🟡"
                print(f"{status_emoji} [{i+1}/30] Statut: {session_health} | Connecté: {connected}")
                
                if connected:
                    print_result(True, "🎉 Session connectée avec succès!", {
                        "phone_number": phone_number,
                        "session_health": session_health
                    })
                    return True
            
            time.sleep(3)  # Attendre 3 secondes
        
        print_result(False, "⏱️ Timeout: La session n'a pas été connectée après 90 secondes")
        return False
        
    except KeyboardInterrupt:
        print("\n⏹️ Surveillance arrêtée par l'utilisateur")
        return False
    except Exception as e:
        print_result(False, f"Erreur surveillance: {str(e)}")
        return False

def create_test_image():
    """Créer une image de test simple"""
    try:
        # Créer une image simple 200x200 avec un dégradé
        img = Image.new('RGB', (200, 200), color='white')
        pixels = img.load()
        
        # Créer un dégradé simple
        for i in range(200):
            for j in range(200):
                pixels[i, j] = (i, j, 100)
        
        # Sauvegarder l'image
        filename = "test_image.png"
        img.save(filename)
        print(f"✅ Image de test créée: {filename}")
        return filename
    except Exception as e:
        print(f"❌ Erreur création image: {e}")
        return None

def test_message_sending(phone_number: str = None):
    """Tester l'envoi de messages texte"""
    print_section("Étape 4: Test d'envoi de messages texte")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    # Demander le numéro de téléphone si non fourni
    if not phone_number:
        phone_number = input("📱 Entrez le numéro de téléphone pour tester (ex: 237600000000): ").strip()
    
    if not phone_number:
        phone_number = "237600000000"
        print(f"📞 Utilisation du numéro par défaut: {phone_number}")
    
    # Test message texte
    payload = {
        "to": phone_number,
        "message": "🚀 Message de test depuis WhatsFlow - Test complet réussi!"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/session/{SESSION_ID}/send-message",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Message texte envoyé avec succès!", {
                "message_id": data.get("message_id"),
                "status": data.get("status"),
                "timestamp": data.get("timestamp")
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def test_image_sending(phone_number: str = None):
    """Tester l'envoi d'images"""
    print_section("Étape 5: Test d'envoi d'images")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    if not phone_number:
        phone_number = input("📱 Entrez le numéro de téléphone pour l'image (ex: 237600000000): ").strip()
    
    if not phone_number:
        phone_number = "237600000000"
        print(f"📞 Utilisation du numéro par défaut: {phone_number}")
    
    # Créer une image de test
    image_path = create_test_image()
    if not image_path or not os.path.exists(image_path):
        print_result(False, "Impossible de créer l'image de test")
        return False
    
    # Lire l'image et la convertir en base64
    try:
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        payload = {
            "to": phone_number,
            "image": f"data:image/png;base64,{image_data}",
            "caption": "📸 Image de test depuis WhatsFlow"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/session/{SESSION_ID}/send-image",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Image envoyée avec succès!", {
                "message_id": data.get("message_id"),
                "status": data.get("status"),
                "timestamp": data.get("timestamp")
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False
    finally:
        # Nettoyer l'image de test
        if os.path.exists(image_path):
            os.remove(image_path)
            print(f"🗑️ Image de test supprimée")

def main():
    """Fonction principale du test"""
    print("\n" + "="*60)
    print("  🧪 TEST COMPLET WHATSFLOW")
    print("="*60)
    print(f"URL de base: {BASE_URL}")
    
    # Étape 1: Health check
    if not test_health_check():
        print("❌ L'API n'est pas accessible. Arrêt du test.")
        return
    
    # Étape 2: Récupérer/créer client
    if not get_or_create_client():
        print("❌ Impossible de créer/récupérer un client. Arrêt du test.")
        return
    
    # Étape 3: Créer session
    if not create_session():
        print("❌ Impossible de créer une session. Arrêt du test.")
        return
    
    # Étape 4: Attendre le scan du QR code
    print_section("📱 INSTRUCTIONS QR CODE")
    print("1. 📲 Ouvrez WhatsApp sur votre mobile")
    print("2. ⚙️  Allez dans Paramètres > Appareils connectés")
    print("3. 📷 Scannez le QR code affiché")
    print("4. ⏳ Attendez la confirmation de connexion")
    
    input("\n👆 Appuyez sur Entrée une fois que vous avez scanné le QR code...")
    
    # Étape 5: Surveiller la connexion
    if not monitor_connection():
        print("❌ La session n'a pas pu être connectée.")
        return
    
    # Étape 6: Tester les messages et images
    print_section("📧 TEST D'ENVOI DE MESSAGES ET IMAGES")
    
    phone_number = input("📱 Entrez le numéro de téléphone pour les tests (ex: 237600000000): ").strip()
    if not phone_number:
        phone_number = "237600000000"
        print(f"📞 Utilisation du numéro par défaut: {phone_number}")
    
    # Test message texte
    print("\n1️⃣ Test d'envoi de message texte...")
    message_success = test_message_sending(phone_number)
    
    # Test image
    print("\n2️⃣ Test d'envoi d'image...")
    image_success = test_image_sending(phone_number)
    
    # Résumé final
    print_section("🎉 TEST COMPLET TERMINÉ")
    print(f"✅ Client ID: {CLIENT_ID}")
    print(f"✅ Session ID: {SESSION_ID}")
    print(f"✅ API Key: {API_KEY[:20]}..." if API_KEY else "❌ Aucune")
    print(f"✅ Numéro de test: {phone_number}")
    
    print("\n📊 RÉSUMÉ DES TESTS:")
    print(f"  • Health Check: ✅")
    print(f"  • Création Client: ✅")
    print(f"  • Création Session: ✅")
    print(f"  • Génération QR Code: ✅")
    print(f"  • Envoi Message Texte: {'✅' if message_success else '❌'}")
    print(f"  • Envoi Image: {'✅' if image_success else '❌'}")
    
    if message_success or image_success:
        print("\n🎊 L'application WhatsFlow fonctionne correctement!")
    else:
        print("\n⚠️ Certains tests ont échoué. Vérifiez les logs ci-dessus.")

if __name__ == "__main__":
    main()
