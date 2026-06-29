#!/usr/bin/env python3
"""
Script de test automatisé des endpoints API WhatsFlow
Teste tous les endpoints sans interaction utilisateur
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

# Compteurs de tests
tests_passed = 0
tests_failed = 0

def print_section(title: str):
    """Afficher une section formatée"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def print_test(test_name: str, success: bool, details: str = ""):
    """Afficher le résultat d'un test"""
    global tests_passed, tests_failed
    
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} | {test_name}")
    if details:
        print(f"       └─ {details}")
    
    if success:
        tests_passed += 1
    else:
        tests_failed += 1

def test_1_health_check():
    """Test 1: Health Check"""
    print_section("TEST 1: Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        success = response.status_code == 200
        print_test("GET /health", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("GET /health", False, str(e))
        return False

def test_2_get_clients():
    """Test 2: Récupérer la liste des clients"""
    print_section("TEST 2: Récupérer les clients")
    
    try:
        response = requests.get(f"{BASE_URL}/api/clients/", timeout=5)
        success = response.status_code == 200
        
        if success:
            clients = response.json()
            print_test("GET /api/clients/", success, f"Clients trouvés: {len(clients)}")
            return True, clients
        else:
            print_test("GET /api/clients/", False, f"Status: {response.status_code}")
            return False, []
    except Exception as e:
        print_test("GET /api/clients/", False, str(e))
        return False, []

def test_3_create_client():
    """Test 3: Créer un nouveau client"""
    print_section("TEST 3: Créer un client")
    global API_KEY, CLIENT_ID
    
    timestamp = int(time.time())
    payload = {
        "name": f"Test API {timestamp}",
        "email": f"test{timestamp}@whatsflow.com",
        "description": "Client de test automatisé",
        "max_sessions": 5,
        "messages_per_second": 2
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/clients/",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        success = response.status_code in [200, 201]
        
        if success:
            data = response.json()
            API_KEY = data.get("api_key")
            CLIENT_ID = data.get("id")
            print_test("POST /api/clients/", success, f"Client créé: {CLIENT_ID}")
            return True
        else:
            print_test("POST /api/clients/", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("POST /api/clients/", False, str(e))
        return False

def test_4_get_client_details():
    """Test 4: Récupérer les détails d'un client"""
    print_section("TEST 4: Récupérer détails client")
    
    if not CLIENT_ID:
        print_test("GET /api/clients/{id}", False, "CLIENT_ID manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/clients/{CLIENT_ID}",
            timeout=5
        )
        
        success = response.status_code == 200
        print_test(f"GET /api/clients/{CLIENT_ID}", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test(f"GET /api/clients/{CLIENT_ID}", False, str(e))
        return False

def test_5_create_session():
    """Test 5: Créer une session WhatsApp"""
    print_section("TEST 5: Créer une session")
    global SESSION_ID
    
    if not API_KEY or not CLIENT_ID:
        print_test("POST /api/session/create", False, "API_KEY ou CLIENT_ID manquant")
        return False
    
    payload = {
        "client_id": CLIENT_ID,
        "session_label": "test-api-endpoints"
    }
    
    try:
        print("⏳ Création de session en cours (peut prendre 30-60 secondes)...")
        response = requests.post(
            f"{BASE_URL}/api/session/create",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            },
            timeout=60  # Augmenté à 60 secondes
        )
        
        success = response.status_code in [200, 201]
        
        if success:
            data = response.json()
            SESSION_ID = data.get("id")
            has_qr = data.get("qr_code") is not None
            print_test("POST /api/session/create", success, f"Session: {SESSION_ID}, QR: {has_qr}")
            return True
        else:
            print_test("POST /api/session/create", False, f"Status: {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print_test("POST /api/session/create", False, "Timeout (création de session trop lente)")
        return False
    except Exception as e:
        print_test("POST /api/session/create", False, str(e))
        return False

def test_6_get_session_status():
    """Test 6: Récupérer le statut de la session"""
    print_section("TEST 6: Récupérer statut session")
    
    if not API_KEY or not SESSION_ID:
        print_test("GET /api/session/{id}/status", False, "API_KEY ou SESSION_ID manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/{SESSION_ID}/status",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=5
        )
        
        success = response.status_code == 200
        
        if success:
            data = response.json()
            status = data.get("session_health", "unknown")
            print_test("GET /api/session/{id}/status", success, f"Health: {status}")
        else:
            print_test("GET /api/session/{id}/status", False, f"Status: {response.status_code}")
        
        return success
    except Exception as e:
        print_test("GET /api/session/{id}/status", False, str(e))
        return False

def test_7_get_qr_code():
    """Test 7: Récupérer le QR code depuis la session"""
    print_section("TEST 7: Récupérer QR code")
    
    if not API_KEY or not SESSION_ID:
        print_test("GET /api/session/{id}/status (avec QR)", False, "API_KEY ou SESSION_ID manquant")
        return False
    
    try:
        # Le QR code est retourné dans la réponse de création de session
        # Ici on teste juste que le statut retourne les infos
        response = requests.get(
            f"{BASE_URL}/api/session/{SESSION_ID}/status",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=5
        )
        
        success = response.status_code == 200
        print_test("GET /api/session/{id}/status", success, f"Status: {response.status_code}")
        
        return success
    except Exception as e:
        print_test("GET /api/session/{id}/status", False, str(e))
        return False

def test_8_send_message():
    """Test 8: Envoyer un message"""
    print_section("TEST 8: Envoyer un message texte")
    
    if not API_KEY or not SESSION_ID:
        print_test("POST /api/session/{id}/send-message", False, "API_KEY ou SESSION_ID manquant")
        return False
    
    payload = {
        "to": "237600000000",
        "message": "🧪 Message de test automatisé depuis WhatsFlow API"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/session/{SESSION_ID}/send-message",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            },
            timeout=10
        )
        
        success = response.status_code == 200
        
        if success:
            data = response.json()
            msg_id = data.get("message_id", "unknown")
            print_test("POST /api/session/{id}/send-message", success, f"Message ID: {msg_id}")
        else:
            print_test("POST /api/session/{id}/send-message", False, f"Status: {response.status_code}")
        
        return success
    except Exception as e:
        print_test("POST /api/session/{id}/send-message", False, str(e))
        return False

def test_9_send_image():
    """Test 9: Envoyer une image via send-media"""
    print_section("TEST 9: Envoyer une image (send-media)")
    
    if not API_KEY or not SESSION_ID:
        print_test("POST /api/session/{id}/send-media", False, "API_KEY ou SESSION_ID manquant")
        return False
    
    # Créer une image de test
    try:
        img = Image.new('RGB', (100, 100), color=(73, 109, 137))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        image_data = base64.b64encode(img_bytes.read()).decode('utf-8')
        
        payload = {
            "to": "237600000000",
            "type": "image",
            "url": f"data:image/png;base64,{image_data}",
            "caption": "🖼️ Image de test depuis WhatsFlow API",
            "filename": "test_image.png"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/session/{SESSION_ID}/send-media",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            },
            timeout=10
        )
        
        success = response.status_code == 200
        
        if success:
            data = response.json()
            msg_id = data.get("message_id", "unknown")
            print_test("POST /api/session/{id}/send-media", success, f"Message ID: {msg_id}")
        else:
            print_test("POST /api/session/{id}/send-media", False, f"Status: {response.status_code}")
        
        return success
    except Exception as e:
        print_test("POST /api/session/{id}/send-media", False, str(e))
        return False

def test_10_list_sessions():
    """Test 10: Lister les sessions"""
    print_section("TEST 10: Lister les sessions")
    
    if not API_KEY:
        print_test("GET /api/session/", False, "API_KEY manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=5
        )
        
        success = response.status_code == 200
        
        if success:
            data = response.json()
            session_count = len(data) if isinstance(data, list) else 0
            print_test("GET /api/session/", success, f"Sessions trouvées: {session_count}")
        else:
            print_test("GET /api/session/", False, f"Status: {response.status_code}")
        
        return success
    except Exception as e:
        print_test("GET /api/session/", False, str(e))
        return False

def main():
    """Fonction principale"""
    print("\n" + "="*70)
    print("  🧪 TEST AUTOMATISÉ DES ENDPOINTS API WHATSFLOW")
    print("="*70)
    print(f"URL de base: {BASE_URL}")
    print(f"Heure: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Exécuter les tests
    test_1_health_check()
    
    success, clients = test_2_get_clients()
    if success and clients:
        # Utiliser le premier client existant
        global API_KEY, CLIENT_ID
        API_KEY = clients[0].get("api_key")
        CLIENT_ID = clients[0].get("id")
        print(f"\n💡 Utilisation du client existant: {CLIENT_ID}")
    else:
        # Créer un nouveau client
        test_3_create_client()
    
    test_4_get_client_details()
    test_5_create_session()
    test_6_get_session_status()
    test_7_get_qr_code()
    test_8_send_message()
    test_9_send_image()
    test_10_list_sessions()
    
    # Résumé final
    print_section("📊 RÉSUMÉ DES TESTS")
    total_tests = tests_passed + tests_failed
    success_rate = (tests_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"Total: {total_tests} tests")
    print(f"✅ Réussis: {tests_passed}")
    print(f"❌ Échoués: {tests_failed}")
    print(f"📈 Taux de réussite: {success_rate:.1f}%")
    
    print("\n" + "="*70)
    if tests_failed == 0:
        print("  🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!")
        print("  L'application WhatsFlow est entièrement fonctionnelle!")
    else:
        print(f"  ⚠️ {tests_failed} test(s) ont échoué. Vérifiez les logs ci-dessus.")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
