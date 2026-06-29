"""
Script de test pour valider la migration vers Baileys
"""
import asyncio
import httpx
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8001"
CLIENT_API_KEY = "whatsflow_api_key_2024_secure_random_string_here"

async def test_migration():
    """Tester la migration vers Baileys"""
    
    print("🧪 Test de Migration vers Baileys")
    print("=" * 50)
    print()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Test 1: Health Check de l'API
        print("📋 Test 1/5 : Health Check de l'API...")
        try:
            response = await client.get(f"{API_BASE_URL}/health")
            if response.status_code == 200:
                print("✅ API est accessible")
                print(f"   Réponse: {response.json()}")
            else:
                print(f"❌ API non accessible (status: {response.status_code})")
                return
        except Exception as e:
            print(f"❌ Erreur de connexion à l'API: {e}")
            return
        
        print()
        
        # Test 2: Création d'une session
        print("📋 Test 2/5 : Création d'une session WhatsApp...")
        session_data = {
            "client_id": 1,
            "agent_name": f"Test-Baileys-{datetime.now().strftime('%H%M%S')}"
        }
        
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/v1/sessions/",
                json=session_data,
                headers={"X-API-Key": CLIENT_API_KEY}
            )
            
            if response.status_code == 200:
                data = response.json()
                session_id = data.get("session_id")
                qr_code = data.get("qr_code")
                
                print(f"✅ Session créée avec succès")
                print(f"   Session ID: {session_id}")
                print(f"   QR Code: {'Présent' if qr_code else 'Absent'}")
                
                # Vérifier que ce n'est pas le placeholder
                if qr_code and len(qr_code) > 200:
                    print("✅ QR Code semble valide (taille > 200 caractères)")
                    
                    # Sauvegarder le QR code
                    with open("test_qr_baileys.txt", "w") as f:
                        f.write(qr_code)
                    print("   💾 QR Code sauvegardé dans test_qr_baileys.txt")
                else:
                    print("⚠️  QR Code semble être un placeholder")
                    
            else:
                print(f"❌ Erreur lors de la création de session (status: {response.status_code})")
                print(f"   Réponse: {response.text}")
                return
                
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return
        
        print()
        
        # Test 3: Vérification du statut de la session
        print("📋 Test 3/5 : Vérification du statut de la session...")
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/v1/sessions/{session_id}",
                headers={"X-API-Key": CLIENT_API_KEY}
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Statut récupéré")
                print(f"   État: {data.get('status')}")
                print(f"   Agent: {data.get('agent_name')}")
            else:
                print(f"⚠️  Impossible de récupérer le statut (status: {response.status_code})")
                
        except Exception as e:
            print(f"⚠️  Erreur: {e}")
        
        print()
        
        # Test 4: Vérification du conteneur Docker
        print("📋 Test 4/5 : Vérification du conteneur Docker...")
        try:
            import subprocess
            result = subprocess.run(
                ["docker", "ps", "--filter", f"name=whatsapp_{session_id}", "--format", "{{.Status}}"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                print(f"✅ Conteneur actif: {result.stdout.strip()}")
            else:
                print("⚠️  Conteneur non trouvé ou non actif")
                
        except Exception as e:
            print(f"⚠️  Impossible de vérifier le conteneur: {e}")
        
        print()
        
        # Test 5: Vérification du moteur WhatsApp
        print("📋 Test 5/5 : Vérification du moteur WhatsApp...")
        try:
            # Attendre un peu que le conteneur démarre
            await asyncio.sleep(3)
            
            # Essayer de contacter le conteneur directement
            engine_url = f"http://whatsapp_{session_id}:3010/health"
            
            # Note: Ceci ne fonctionnera que si on est dans le réseau Docker
            print(f"   URL du moteur: {engine_url}")
            print("   ℹ️  (Accessible uniquement depuis le réseau Docker)")
            
        except Exception as e:
            print(f"⚠️  Erreur: {e}")
        
        print()
        print("=" * 50)
        print("🎉 Tests terminés !")
        print()
        print("📊 Résumé:")
        print("  - API: ✅ Fonctionnelle")
        print("  - Session: ✅ Créée")
        print(f"  - QR Code: {'✅ Valide' if qr_code and len(qr_code) > 200 else '⚠️  Placeholder'}")
        print()
        print("📝 Prochaines étapes:")
        print("  1. Vérifier les logs du conteneur:")
        print(f"     docker logs whatsapp_{session_id}")
        print()
        print("  2. Si le QR code est valide, le scanner avec WhatsApp")
        print()
        print("  3. Vérifier la connexion:")
        print(f"     curl http://localhost:8001/api/v1/sessions/{session_id}")
        print()

if __name__ == "__main__":
    asyncio.run(test_migration())
