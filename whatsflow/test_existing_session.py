#!/usr/bin/env python3
"""
Script de test pour utiliser une session existante - WhatsFlow
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

def get_existing_client():
    """Récupérer un client existant"""
    print_section("Étape 1: Récupérer un client existant")
    global API_KEY, CLIENT_ID
    
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
    
    print_result(False, "Aucun client trouvé")
    return False

def list_and_select_session():
    """Lister les sessions et en sélectionner une"""
    print_section("Étape 2: Lister et sélectionner une session")
    global SESSION_ID
    
    if not API_KEY:
        print_result(False, "API_KEY manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        
        if response.status_code == 200:
            sessions = response.json()
            if not sessions:
                print_result(False, "Aucune session trouvée")
                return False
            
            print(f"\n📋 {len(sessions)} session(s) trouvée(s):")
            for i, session in enumerate(sessions, 1):
                status = session.get("status", "inconnu")
                label = session.get("session_label", f"session_{i}")
                session_id = session.get("id", "inconnu")
                print(f"  {i}. [{status}] {label} (ID: {session_id})")
            
            # Demander à l'utilisateur de choisir
            try:
                choice = int(input(f"\n👆 Choisissez une session (1-{len(sessions)}): ")) - 1
                if 0 <= choice < len(sessions):
                    selected_session = sessions[choice]
                    SESSION_ID = selected_session.get("id")
                    print_result(True, "Session sélectionnée", {
                        "session_id": SESSION_ID,
                        "session_label": selected_session.get("session_label"),
                        "status": selected_session.get("status")
                    })
                    return True
                else:
                    print_result(False, "Choix invalide")
                    return False
            except ValueError:
                print_result(False, "Entrée invalide")
                return False
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def get_session_status():
    """Récupérer le statut détaillé de la session"""
    print_section("Étape 3: Statut détaillé de la session")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/{SESSION_ID}/status",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Statut de la session", {
                "connected": data.get("connected"),
                "phone_number": data.get("phone_number"),
                "session_health": data.get("session_health"),
                "messages_today": data.get("messages_today"),
                "last_active": data.get("last_active")
            })
            
            # Si la session a un QR code (non connectée)
            if not data.get("connected") and "qr_code" in data:
                qr_data = data.get("qr_code")
                if qr_data:
                    print("\n📱 QR Code disponible pour cette session")
                    save_and_display_qr_code(qr_data, SESSION_ID)
            
            return True
        else:
            print_result(False, f"Code: {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Erreur: {str(e)}")
        return False

def monitor_connection():
    """Surveiller la connexion de la session"""
    print_section("Étape 4: Surveillance de la connexion")
    
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

def test_message_sending():
    """Tester l'envoi de messages"""
    print_section("Étape 5: Test d'envoi de messages")
    
    if not API_KEY or not SESSION_ID:
        print_result(False, "API_KEY ou SESSION_ID manquant")
        return False
    
    # Demander le numéro de téléphone
    phone_number = input("📱 Entrez le numéro de téléphone pour tester (ex: 237600000000): ").strip()
    
    if not phone_number:
        phone_number = "237600000000"
        print(f"📞 Utilisation du numéro par défaut: {phone_number}")
    
    # Test message texte
    payload = {
        "to": phone_number,
        "message": "🚀 Message de test depuis WhatsFlow - Test avec session existante!"
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
            print_result(True, "Message envoyé avec succès!", {
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

def main():
    """Fonction principale du test"""
    print("\n" + "="*60)
    print("  🧪 TEST WHATSFLOW - SESSION EXISTANTE")
    print("="*60)
    print(f"URL de base: {BASE_URL}")
    
    # Étape 1: Health check
    if not test_health_check():
        print("❌ L'API n'est pas accessible. Arrêt du test.")
        return
    
    # Étape 2: Récupérer client existant
    if not get_existing_client():
        print("❌ Impossible de récupérer un client. Arrêt du test.")
        return
    
    # Étape 3: Lister et sélectionner session
    if not list_and_select_session():
        print("❌ Impossible de sélectionner une session. Arrêt du test.")
        return
    
    # Étape 4: Vérifier statut et afficher QR code si nécessaire
    if not get_session_status():
        print("❌ Impossible de récupérer le statut de la session.")
        return
    
    # Étape 5: Attendre le scan du QR code si non connecté
    choice = input("\n📱 La session est-elle déjà connectée? (o/n): ").strip().lower()
    
    if choice != 'o':
        print_section("📱 INSTRUCTIONS QR CODE")
        print("1. 📲 Ouvrez WhatsApp sur votre mobile")
        print("2. ⚙️  Allez dans Paramètres > Appareils connectés")
        print("3. 📷 Scannez le QR code affiché")
        print("4. ⏳ Attendez la confirmation de connexion")
        
        input("\n👆 Appuyez sur Entrée une fois que vous avez scanné le QR code...")
        
        # Étape 6: Surveiller la connexion
        if not monitor_connection():
            print("❌ La session n'a pas pu être connectée.")
            return
    
    # Étape 7: Tester les messages
    print_section("📧 TEST D'ENVOI DE MESSAGES")
    choice = input("Voulez-vous tester l'envoi de messages? (o/n): ").strip().lower()
    
    if choice == 'o':
        test_message_sending()
    
    # Résumé final
    print_section("🎉 TEST TERMINÉ")
    print(f"✅ Client ID: {CLIENT_ID}")
    print(f"✅ Session ID: {SESSION_ID}")
    print(f"✅ API Key: {API_KEY[:20]}..." if API_KEY else "❌ Aucune")
    print("\n📊 L'application WhatsFlow fonctionne correctement!")

if __name__ == "__main__":
    main()
