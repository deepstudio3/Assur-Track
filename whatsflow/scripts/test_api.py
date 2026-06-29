"""
Script de test de l'API WhatsFlow
"""
import httpx
import asyncio
import json


# Configuration
API_BASE_URL = "http://localhost:8000"
API_KEY = "VOTRE_API_KEY_ICI"  # À remplacer par la clé générée


async def test_api():
    """Tester les endpoints principaux de l'API"""
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        print("\n" + "="*60)
        print("🧪 Test de l'API WhatsFlow")
        print("="*60 + "\n")
        
        # 1. Vérifier la santé de l'API
        print("1️⃣ Test du health check...")
        response = await client.get(f"{API_BASE_URL}/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}\n")
        
        # 2. Créer une session
        print("2️⃣ Création d'une session WhatsApp...")
        session_data = {
            "client_id": "swift-ai",
            "session_label": "test-session"
        }
        response = await client.post(
            f"{API_BASE_URL}/api/session/create",
            headers=headers,
            json=session_data
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 201:
            session = response.json()
            session_id = session["id"]
            print(f"   Session ID: {session_id}")
            print(f"   Status: {session['status']}\n")
            
            # 3. Vérifier le statut de la session
            print("3️⃣ Vérification du statut de la session...")
            response = await client.get(
                f"{API_BASE_URL}/api/{session_id}/status",
                headers=headers
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {json.dumps(response.json(), indent=2)}\n")
            
            # 4. Envoyer un message (simulé)
            print("4️⃣ Envoi d'un message de test...")
            message_data = {
                "to": "237600000000",
                "message": "Test message depuis WhatsFlow 🚀"
            }
            response = await client.post(
                f"{API_BASE_URL}/api/{session_id}/send-message",
                headers=headers,
                json=message_data
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   Response: {json.dumps(response.json(), indent=2)}\n")
            else:
                print(f"   Error: {response.text}\n")
        else:
            print(f"   Error: {response.text}\n")
        
        print("="*60)
        print("✅ Tests terminés!")
        print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(test_api())
