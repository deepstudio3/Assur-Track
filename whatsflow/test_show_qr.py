#!/usr/bin/env python3
"""
Script simple pour afficher le QR code de la session existante
"""
import requests
import json
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
    print("  📱 AFFICHAGE QR CODE WHATSFLOW")
    print('='*60)
    
    # Étape 1: Récupérer le premier client
    print_section("1. Récupération du client")
    try:
        response = requests.get(f"{BASE_URL}/api/clients/")
        if response.status_code == 200:
            clients = response.json()
            if clients:
                client = clients[0]
                API_KEY = client.get("api_key")
                CLIENT_ID = client.get("id")
                print(f"✅ Client trouvé: {client.get('name')}")
                print(f"   API Key: {API_KEY[:20]}...")
            else:
                print("❌ Aucun client trouvé")
                return
        else:
            print(f"❌ Erreur: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # Étape 2: Récupérer la première session
    print_section("2. Récupération de la session")
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        if response.status_code == 200:
            sessions = response.json()
            if sessions:
                session = sessions[0]
                SESSION_ID = session.get("id")
                print(f"✅ Session trouvée: {session.get('session_label')}")
                print(f"   ID: {SESSION_ID}")
                print(f"   Statut: {session.get('status')}")
            else:
                print("❌ Aucune session trouvée")
                return
        else:
            print(f"❌ Erreur: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # Étape 3: Récupérer le QR code
    print_section("3. Récupération du QR code")
    try:
        response = requests.get(
            f"{BASE_URL}/api/session/{SESSION_ID}/status",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        if response.status_code == 200:
            data = response.json()
            
            connected = data.get("connected", False)
            print(f"📊 Statut connexion: {'🟢 Connecté' if connected else '🟡 Non connecté'}")
            
            if not connected and "qr_code" in data:
                qr_data = data.get("qr_code")
                if qr_data:
                    print("📱 QR Code trouvé!")
                    save_and_display_qr_code(qr_data, SESSION_ID)
                    
                    print_section("📋 INSTRUCTIONS")
                    print("1. 📲 Ouvrez WhatsApp sur votre mobile")
                    print("2. ⚙️  Allez dans Paramètres > Appareils connectés")
                    print("3. 📷 Scannez le QR code affiché")
                    print("4. ⏳ Attendez la confirmation de connexion")
                    
                    # Surveillance automatique
                    print_section("📡 SURVEILLANCE AUTOMATIQUE")
                    print("Surveillance de la connexion en cours...")
                    
                    import time
                    for i in range(20):  # 20 tentatives (60 secondes)
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
                                    break
                            print(f"⏳ [{i+1}/20] En attente de connexion...")
                            time.sleep(3)
                        except:
                            pass
                else:
                    print("❌ QR code vide")
            elif connected:
                print("✅ Session déjà connectée!")
                print(f"📞 Téléphone: {data.get('phone_number')}")
            else:
                print("❌ Aucun QR code disponible")
        else:
            print(f"❌ Erreur: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    main()
