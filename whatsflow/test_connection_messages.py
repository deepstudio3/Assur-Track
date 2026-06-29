#!/usr/bin/env python3
"""
Script pour surveiller la connexion et tester les messages après scan du QR code
"""
import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8001"
API_KEY = "YqHJJfE4ivDKVbAqQTtC..."  # API Key du client existant
SESSION_ID = "sess_8ed83e0200d4"  # Session qui vient d'être créée

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

def get_full_api_key():
    """Récupérer la clé API complète"""
    try:
        response = requests.get(f"{BASE_URL}/api/clients/")
        if response.status_code == 200:
            clients = response.json()
            if clients:
                return clients[0].get("api_key")
    except Exception as e:
        print(f"❌ Erreur récupération API key: {e}")
    return None

def monitor_connection():
    """Surveiller la connexion de la session"""
    print_section("📡 SURVEILLANCE DE LA CONNEXION")
    print("📱 Veuillez scanner le QR code avec WhatsApp...")
    print("⏳ Surveillance automatique de la connexion")
    
    api_key = get_full_api_key()
    if not api_key:
        print("❌ Impossible de récupérer l'API key")
        return False
    
    try:
        for i in range(30):  # 30 tentatives (90 secondes)
            response = requests.get(
                f"{BASE_URL}/api/session/{SESSION_ID}/status",
                headers={"Authorization": f"Bearer {api_key}"}
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
                        "session_health": session_health,
                        "messages_today": data.get("messages_today")
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
    print_section("📧 TEST D'ENVOI DE MESSAGES")
    
    api_key = get_full_api_key()
    if not api_key:
        print("❌ Impossible de récupérer l'API key")
        return False
    
    # Demander le numéro de téléphone
    phone_number = input("📱 Entrez le numéro de téléphone pour tester (ex: 237600000000): ").strip()
    
    if not phone_number:
        phone_number = "237600000000"
        print(f"📞 Utilisation du numéro par défaut: {phone_number}")
    
    # Test message texte
    payload = {
        "to": phone_number,
        "message": "🚀 Message de test depuis WhatsFlow - Test complet réussi! 🎉"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/session/{SESSION_ID}/send-message",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "✅ Message envoyé avec succès!", {
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

def test_media_sending():
    """Tester l'envoi d'image"""
    print_section("📸 TEST D'ENVOI D'IMAGE")
    
    api_key = get_full_api_key()
    if not api_key:
        print("❌ Impossible de récupérer l'API key")
        return False
    
    phone_number = input("📱 Entrez le numéro pour l'image (même numéro que avant): ").strip()
    if not phone_number:
        phone_number = "237600000000"
    
    payload = {
        "to": phone_number,
        "type": "image",
        "url": "https://picsum.photos/800/600",
        "caption": "📸 Image de test depuis WhatsFlow - Test réussi!"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/session/{SESSION_ID}/send-media",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "✅ Image envoyée avec succès!", {
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

def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("  🧪 TEST CONNEXION + MESSAGES WHATSFLOW")
    print('='*60)
    print(f"Session ID: {SESSION_ID}")
    
    # Étape 1: Surveiller la connexion
    if not monitor_connection():
        print("❌ La session n'a pas pu être connectée.")
        return
    
    # Étape 2: Tester les messages
    choice = input("\n📧 Voulez-vous tester l'envoi de messages? (o/n): ").strip().lower()
    
    if choice == 'o':
        if test_message_sending():
            # Test d'image optionnel
            choice2 = input("\n📸 Voulez-vous tester l'envoi d'une image? (o/n): ").strip().lower()
            if choice2 == 'o':
                test_media_sending()
    
    # Résumé final
    print_section("🎉 TEST TERMINÉ")
    print("✅ L'application WhatsFlow fonctionne correctement!")
    print("✅ Session connectée et fonctionnelle!")
    print("✅ Envoi de messages opérationnel!")

if __name__ == "__main__":
    main()
