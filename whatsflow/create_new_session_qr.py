#!/usr/bin/env python3
"""
Script pour créer une nouvelle session et afficher le QR code immédiatement
"""
import requests
import json
import base64
from typing import Optional
import os
from PIL import Image
import io
import time

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

def save_and_display_qr_code(qr_code_data: str, session_id: str):
    """Sauvegarde et affiche le QR code"""
    try:
        # Extraire les données base64 de l'image
        if ',' in qr_code_data:
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
        
        # Afficher l'image avec PIL
        try:
            image = Image.open(io.BytesIO(image_data))
            print(f"📏 Dimensions: {image.size[0]}x{image.size[1]} pixels")
            
            # Ouvrir automatiquement l'image
            image.show()
            print("👀 QR Code affiché dans la visionneuse d'images")
            
        except Exception as img_error:
            print(f"⚠️ Impossible d'afficher automatiquement: {img_error}")
            print(f"💡 Ouvrez manuellement le fichier: {filename}")
            
    except Exception as e:
        print(f"❌ Erreur traitement QR code: {str(e)}")

def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("  📱 CRÉATION SESSION + QR CODE WHATSFLOW")
    print('='*60)
    
    # Étape 1: Récupérer ou créer un client pour les tests
    print_section("1. Récupération ou création du client")
    for i in range(5): # 5 tentatives
        try:
            response = requests.get(f"{BASE_URL}/api/clients/")
            if response.status_code == 200:
                break # Succès, on sort de la boucle
            else:
                print(f"[Tentative {i+1}] API non prête (status: {response.status_code}), nouvelle tentative dans 5s...")
        except requests.exceptions.ConnectionError as e:
            print(f"[Tentative {i+1}] API non prête ({e}), nouvelle tentative dans 5s...")
        time.sleep(5)
    else:
        print("❌ L'API n'a pas démarré à temps. Abandon.")
        return

    try:
        clients = response.json()
        if clients:
            CLIENT_ID = clients[0].get("id")
            API_KEY = clients[0].get("api_key")
            print(f"✅ Client existant trouvé: {clients[0].get('name')}")
        else:
            print("ℹ️ Aucun client trouvé, création d'un client par défaut...")
            create_client_payload = {"name": "Default Client", "email": "default@example.com"}
            create_response = requests.post(f"{BASE_URL}/api/clients/", json=create_client_payload)
            if create_response.status_code == 201:
                client_data = create_response.json()
                CLIENT_ID = client_data.get("id")
                API_KEY = client_data.get("api_key")
                print(f"✅ Client par défaut créé: {client_data.get('name')}")
            else:
                print(f"❌ Erreur lors de la création du client par défaut: {create_response.text}")
                return
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return
    
    # Étape 2: Supprimer les anciennes sessions pour libérer le quota
    print_section("2. Suppression des anciennes sessions")
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        if response.status_code == 200:
            sessions = response.json()
            print(f"📋 {len(sessions)} session(s) trouvée(s)")
            
            for session in sessions:
                session_id = session.get("id")
                try:
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/session/{session_id}",
                        headers={"Authorization": f"Bearer {API_KEY}"}
                    )
                    if delete_response.status_code in [200, 204]:
                        print(f"✅ Session {session_id} supprimée")
                    else:
                        print(f"⚠️ Erreur suppression {session_id}: {delete_response.status_code}")
                except Exception as e:
                    print(f"❌ Erreur suppression {session_id}: {e}")
        else:
            print(f"❌ Erreur listing sessions: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Étape 3: Créer une nouvelle session
    print_section("3. Création d'une nouvelle session")
    try:
        import time
        timestamp = int(time.time())
        payload = {
            "client_id": CLIENT_ID,
            "session_label": f"qr-test-session-{timestamp}"
        }
        
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
            print(f"✅ Session créée: {SESSION_ID}")
            print(f"   Label: {data.get('session_label')}")
            print(f"   Statut: {data.get('status')}")
            
            # Si QR code disponible immédiatement
            if data.get("qr_code"):
                print("📱 QR Code disponible immédiatement!")
                save_and_display_qr_code(data['qr_code'], SESSION_ID)
            else:
                print("⏳ Attente du QR code...")
                
        else:
            print(f"❌ Erreur création session: {response.status_code}")
            print(f"   Détails: {response.json()}")
            return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # Étape 4: Attendre et récupérer le QR code
    print_section("4. Récupération du QR code")
    import time
    
    for i in range(10):  # 10 tentatives
        try:
            response = requests.get(
                f"{BASE_URL}/api/session/{SESSION_ID}/status",
                headers={"Authorization": f"Bearer {API_KEY}"}
            )
            if response.status_code == 200:
                data = response.json()
                
                if "qr_code" in data and data["qr_code"]:
                    print("📱 QR Code trouvé!")
                    save_and_display_qr_code(data['qr_code'], SESSION_ID)
                    
                    print_section("📋 INSTRUCTIONS")
                    print("1. 📲 Ouvrez WhatsApp sur votre mobile")
                    print("2. ⚙️  Allez dans Paramètres > Appareils connectés")
                    print("3. 📷 Scannez le QR code affiché")
                    print("4. ⏳ Attendez la confirmation de connexion")
                    
                    # Surveillance automatique
                    print_section("📡 SURVEILLANCE AUTOMATIQUE")
                    print("Surveillance de la connexion en cours...")
                    
                    for j in range(20):  # 20 tentatives (60 secondes)
                        try:
                            status_response = requests.get(
                                f"{BASE_URL}/api/session/{SESSION_ID}/status",
                                headers={"Authorization": f"Bearer {API_KEY}"}
                            )
                            if status_response.status_code == 200:
                                status_data = status_response.json()
                                if status_data.get("connected"):
                                    print(f"\n🎉 CONNEXION RÉUSSIE!")
                                    print(f"📞 Téléphone: {status_data.get('phone_number')}")
                                    
                                    # Test d'envoi de message
                                    print_section("📧 TEST D'ENVOI DE MESSAGE")
                                    phone = input("Entrez le numéro pour tester (ex: 237600000000): ").strip()
                                    if not phone:
                                        phone = "237600000000"
                                    
                                    msg_payload = {
                                        "to": phone,
                                        "message": "🚀 Test WhatsFlow - Session connectée avec succès!"
                                    }
                                    
                                    msg_response = requests.post(
                                        f"{BASE_URL}/api/session/{SESSION_ID}/send-message",
                                        json=msg_payload,
                                        headers={
                                            "Content-Type": "application/json",
                                            "Authorization": f"Bearer {API_KEY}"
                                        }
                                    )
                                    
                                    if msg_response.status_code == 200:
                                        msg_data = msg_response.json()
                                        print("✅ Message envoyé avec succès!")
                                        print(f"   Message ID: {msg_data.get('message_id')}")
                                    else:
                                        print(f"❌ Erreur envoi message: {msg_response.status_code}")
                                    
                                    break
                            print(f"⏳ [{j+1}/20] En attente de connexion...")
                            time.sleep(3)
                        except:
                            pass
                    
                    break
                else:
                    print(f"⏳ [{i+1}/10] En attente du QR code...")
            else:
                print(f"❌ Erreur statut: {response.status_code}")
            
            time.sleep(2)
        except Exception as e:
            print(f"❌ Erreur: {e}")
            time.sleep(2)
    
    print_section("🎉 TERMINÉ")
    print(f"Session ID: {SESSION_ID}")

if __name__ == "__main__":
    main()
