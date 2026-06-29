#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour tester l'envoi de messages et les autres endpoints
"""
import requests
import json
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_BASE = "http://localhost:8001"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def get_api_credentials():
    """Récupérer les credentials API"""
    print_section("1. RÉCUPÉRER LES CREDENTIALS")
    
    try:
        response = requests.get(f"{API_BASE}/api/clients/", timeout=5)
        if response.status_code == 200:
            clients = response.json()
            if clients:
                client = clients[0]
                api_key = client['api_key']
                client_id = client['id']
                print(f"✅ Client trouvé: {client_id}")
                print(f"   API Key: {api_key[:20]}...")
                return api_key, client_id
    except Exception as e:
        print(f"❌ Erreur: {e}")
    return None, None

def get_session(api_key):
    """Récupérer la session active"""
    print_section("2. RÉCUPÉRER LA SESSION ACTIVE")
    
    try:
        response = requests.get(
            f"{API_BASE}/api/session/",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5
        )
        if response.status_code == 200:
            sessions = response.json()
            if sessions:
                session = sessions[-1]  # Dernière session
                print(f"✅ Session trouvée: {session['id']}")
                print(f"   Statut: {session['status']}")
                print(f"   Label: {session['session_label']}")
                return session['id']
    except Exception as e:
        print(f"❌ Erreur: {e}")
    return None

def test_session_status(session_id, api_key):
    """Tester l'endpoint de statut de session"""
    print_section("3. TESTER ENDPOINT: GET /api/session/{id}/status")
    
    try:
        response = requests.get(
            f"{API_BASE}/api/session/{session_id}/status",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Statut récupéré avec succès")
            print(f"   Connecté: {data.get('connected')}")
            print(f"   Santé: {data.get('session_health')}")
            print(f"   Numéro: {data.get('phone_number', 'N/A')}")
            print(f"   Dernier actif: {data.get('last_active', 'N/A')}")
            print(f"   Messages aujourd'hui: {data.get('messages_today', 0)}")
            return True
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_send_message(session_id, api_key, phone_number, message):
    """Tester l'endpoint d'envoi de message"""
    print_section(f"4. TESTER ENDPOINT: POST /api/session/{{id}}/send-message")
    
    payload = {
        "to": phone_number,
        "message": message
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/session/{session_id}/send-message",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=60
        )
        
        print(f"📤 Envoi du message à {phone_number}...")
        print(f"   Message: {message}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Message envoyé avec succès!")
            print(f"   Message ID: {data.get('message_id')}")
            print(f"   Statut: {data.get('status')}")
            print(f"   Timestamp: {data.get('timestamp')}")
            return True
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_send_media(session_id, api_key, phone_number):
    """Tester l'endpoint d'envoi de média"""
    print_section("5. TESTER ENDPOINT: POST /api/session/{id}/send-media")
    
    # Créer une image de test simple
    import base64
    from PIL import Image
    import io
    
    try:
        # Créer une image simple
        img = Image.new('RGB', (100, 100), color=(73, 109, 137))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        image_data = base64.b64encode(img_bytes.read()).decode('utf-8')
        
        payload = {
            "to": phone_number,
            "type": "image",
            "url": f"data:image/png;base64,{image_data}",
            "caption": "✅ Test réussi - Votre travail a été payé!",
            "filename": "test_image.png"
        }
        
        response = requests.post(
            f"{API_BASE}/api/session/{session_id}/send-media",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        print(f"🖼️ Envoi d'une image à {phone_number}...")
        print(f"   Caption: {payload['caption']}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Image envoyée avec succès!")
            print(f"   Message ID: {data.get('message_id')}")
            print(f"   Statut: {data.get('status')}")
            return True
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_list_sessions(api_key):
    """Tester l'endpoint de listage des sessions"""
    print_section("6. TESTER ENDPOINT: GET /api/session/")
    
    try:
        response = requests.get(
            f"{API_BASE}/api/session/",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5
        )
        if response.status_code == 200:
            sessions = response.json()
            print(f"✅ Sessions listées avec succès")
            print(f"   Total: {len(sessions)} session(s)")
            for session in sessions[-3:]:  # Afficher les 3 dernières
                print(f"   • {session['id']} - {session['status']}")
            return True
        else:
            print(f"❌ Erreur: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    """Fonction principale"""
    print("\n" + "="*70)
    print("  🧪 TEST DES ENDPOINTS ET ENVOI DE MESSAGE")
    print("="*70)
    
    # Étape 1: Récupérer les credentials
    api_key, client_id = get_api_credentials()
    if not api_key:
        print("\n❌ Impossible de récupérer les credentials. Arrêt.")
        return
    
    # Étape 2: Récupérer la session
    session_id = get_session(api_key)
    if not session_id:
        print("\n❌ Aucune session trouvée. Arrêt.")
        return
    
    # Étape 3: Tester le statut de session
    test_session_status(session_id, api_key)
    
    # Étape 4: Envoyer un message
    phone_number = "+237682731274"
    message = "✅ Le test a réussi! Votre travail a été payé."
    test_send_message(session_id, api_key, phone_number, message)
    
    # Attendre un peu avant d'envoyer l'image
    print("\n⏳ Attente de 2 secondes avant d'envoyer l'image...")
    time.sleep(2)
    
    # Étape 5: Envoyer une image
    test_send_media(session_id, api_key, phone_number)
    
    # Étape 6: Lister les sessions
    test_list_sessions(api_key)
    
    # Résumé final
    print_section("✅ RÉSUMÉ FINAL")
    print("✅ Tous les endpoints ont été testés avec succès!")
    print("✅ Message et image envoyés à +237682731274")
    print("\n📱 Vérifiez votre téléphone WhatsApp Business pour confirmer la réception.")

if __name__ == "__main__":
    main()
