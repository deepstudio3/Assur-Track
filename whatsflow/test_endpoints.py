"""
Script de test pour les endpoints de création de session et d'envoi de message
"""
import requests
import json
import time
import base64
from typing import Optional
import os
from PIL import Image
import io

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

def test_create_client():
    """Test 2: Créer un client et obtenir une API Key"""
    print_section("Test 2: Créer un client")
    global API_KEY, CLIENT_ID
    
    payload = {
        "name": "Test Client - WhatsFlow",
        "email": "test@whatsflow.com",
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
            print_result(True, "Client créé avec succès", {
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

def test_create_session():
    """Test 3: Créer une session WhatsApp"""
    print_section("Test 3: Créer une session WhatsApp")
    global SESSION_ID
    
    if not API_KEY or not CLIENT_ID:
        print_result(False, "API_KEY ou CLIENT_ID manquant")
        return False
    
    payload = {
        "client_id": CLIENT_ID,
        "session_label": "test-session-auto"
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

def test_session_status():
    """Test 4: Vérifier le statut de la session"""
    print_section("Test 4: Vérifier le statut de la session")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/{SESSION_ID}/status",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Statut récupéré", {
                "connected": data.get("connected"),
                "phone_number": data.get("phone_number"),
                "session_health": data.get("session_health"),
                "messages_today": data.get("messages_today")
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def test_send_message(phone_number: str = "237600000000"):
    """Test 5: Envoyer un message texte"""
    print_section(f"Test 5: Envoyer un message à {phone_number}")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    payload = {
        "to": phone_number,
        "message": "🚀 Message de test depuis WhatsFlow - Test automatique des endpoints!"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/{SESSION_ID}/send-message",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Message envoyé", {
                "message_id": data.get("message_id"),
                "status": data.get("status"),
                "timestamp": data.get("timestamp")
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            
            # Si la session n'est pas connectée, c'est attendu
            if response.status_code == 400:
                print("\n⚠️  NOTE: Ceci est attendu si la session n'est pas encore connectée via QR code")
            
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def test_send_media_image():
    """Test 6: Envoyer une image"""
    print_section("Test 6: Envoyer une image")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    payload = {
        "to": "237600000000",
        "type": "image",
        "url": "https://picsum.photos/800/600",
        "caption": "📸 Image de test depuis WhatsFlow"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/{SESSION_ID}/send-media",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Image envoyée", {
                "message_id": data.get("message_id"),
                "status": data.get("status")
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def test_list_sessions():
    """Test 7: Lister toutes les sessions"""
    print_section("Test 7: Lister les sessions")
    
    if not API_KEY:
        print_result(False, "API_KEY manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, f"{len(data)} session(s) trouvée(s)", {
                "count": len(data),
                "sessions": [{"id": s.get("id"), "label": s.get("session_label"), "status": s.get("status")} for s in data]
            })
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def run_all_tests():
    """Exécuter tous les tests"""
    print("\n" + "="*60)
    print("  🧪 TESTS DES ENDPOINTS WHATSFLOW")
    print("="*60)
    print(f"URL de base: {BASE_URL}")
    
    results = []
    
    # Tests séquentiels
    results.append(("Health Check", test_health_check()))
    time.sleep(1)
    
    results.append(("Créer un client", test_create_client()))
    time.sleep(1)
    
    results.append(("Créer une session", test_create_session()))
    time.sleep(1)
    
    results.append(("Vérifier le statut", test_session_status()))
    time.sleep(1)
    
    results.append(("Lister les sessions", test_list_sessions()))
    time.sleep(1)
    
    # Test d'envoi de message (peut échouer si pas connecté)
    results.append(("Envoyer un message", test_send_message()))
    time.sleep(1)
    
    results.append(("Envoyer une image", test_send_media_image()))
    
    # Résumé
    print_section("RÉSUMÉ DES TESTS")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\nTests réussis: {passed}/{total}")
    print(f"Taux de succès: {(passed/total)*100:.1f}%\n")
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    # Informations pour les tests manuels
    if CLIENT_ID and API_KEY and SESSION_ID:
        print_section("INFORMATIONS POUR TESTS MANUELS")
        print(f"\nCLIENT_ID: {CLIENT_ID}")
        print(f"API_KEY: {API_KEY}")
        print(f"SESSION_ID: {SESSION_ID}")
        print("\n⚠️  Pour envoyer des messages, scannez d'abord le QR code de la session!")

if __name__ == "__main__":
    run_all_tests()
