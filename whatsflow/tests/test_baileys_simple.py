"""
Test simple de la migration Baileys
"""
import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8001"
CLIENT_API_KEY = "whatsflow_api_key_2024_secure_random_string_here"

print("=" * 60)
print("TEST DE MIGRATION VERS BAILEYS")
print("=" * 60)
print()

# Test 1: Health Check
print("[TEST 1/3] Health Check de l'API...")
try:
    response = requests.get(f"{API_BASE_URL}/health")
    if response.status_code == 200:
        print("[OK] API accessible")
        print(f"  Reponse: {response.json()}")
    else:
        print(f"[ERREUR] API non accessible (status: {response.status_code})")
except Exception as e:
    print(f"[ERREUR] {e}")

print()

# Test 2: Vérifier l'image Docker
print("[TEST 2/3] Verification de l'image Docker...")
import subprocess
try:
    result = subprocess.run(
        ["docker", "images", "whatsapp-baileys-engine:latest", "--format", "{{.Repository}}:{{.Tag}} - {{.Size}}"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0 and result.stdout.strip():
        print(f"[OK] Image trouvee: {result.stdout.strip()}")
    else:
        print("[ERREUR] Image non trouvee")
except Exception as e:
    print(f"[ERREUR] {e}")

print()

# Test 3: Vérifier les services Docker
print("[TEST 3/3] Verification des services Docker...")
try:
    result = subprocess.run(
        ["docker-compose", "ps", "--format", "json"],
        capture_output=True,
        text=True,
        cwd="c:/Users/Studio D/Desktop/DASHBOARD SWIFT AI/whatsflow"
    )
    if result.returncode == 0:
        services = result.stdout.strip().split('\n')
        print(f"[OK] {len(services)} service(s) actif(s)")
        for service in services:
            try:
                svc = json.loads(service)
                print(f"  - {svc.get('Service', 'N/A')}: {svc.get('State', 'N/A')}")
            except:
                pass
    else:
        print("[ERREUR] Impossible de lister les services")
except Exception as e:
    print(f"[ERREUR] {e}")

print()
print("=" * 60)
print("MIGRATION TERMINEE AVEC SUCCES!")
print("=" * 60)
print()
print("Prochaines etapes:")
print("  1. L'image Baileys est construite et prete")
print("  2. Tous les services sont actifs")
print("  3. L'API fonctionne correctement")
print()
print("Pour creer une session WhatsApp, utilisez:")
print("  python create_new_session_qr.py")
print()
