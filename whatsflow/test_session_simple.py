"""
Test simple de creation de session Baileys
"""
import requests
import time

API_BASE_URL = "http://localhost:8001"
API_KEY = "GtrvGJ0d4T7BhQusH9OCaCVZKuU4dC28mzamZ6bAYWE"

print("=" * 60)
print("TEST CREATION SESSION BAILEYS")
print("=" * 60)
print()

# Etape 1: Creer une session
print("[1/3] Creation de la session...")
response = requests.post(
    f"{API_BASE_URL}/api/session/create",
    json={"client_id": "client_018d0ec0c499", "session_label": "Test-Baileys-Final"},
    headers={"Authorization": f"Bearer {API_KEY}"}
)

if response.status_code != 200:
    print(f"[ERREUR] Impossible de creer la session: {response.status_code}")
    print(f"Reponse: {response.text}")
    exit(1)

data = response.json()
session_id = data.get("session_id")
qr_code = data.get("qr_code")

print(f"[OK] Session creee: {session_id}")
print(f"[OK] QR Code: {'Present' if qr_code else 'Absent'}")

if qr_code:
    print(f"[OK] Taille QR: {len(qr_code)} caracteres")
    if len(qr_code) > 200:
        print("[SUCCESS] QR Code semble valide (>200 caracteres)")
        
        # Sauvegarder le QR code
        with open(f"qr_test_{session_id}.txt", "w") as f:
            f.write(qr_code)
        print(f"[OK] QR Code sauvegarde dans qr_test_{session_id}.txt")
    else:
        print("[ERREUR] QR Code est un placeholder (<200 caracteres)")
else:
    print("[ERREUR] Aucun QR code recu")

print()

# Etape 2: Verifier les logs du conteneur
print("[2/3] Verification des logs du conteneur...")
import subprocess
try:
    result = subprocess.run(
        ["docker", "logs", f"whatsapp_{session_id}", "--tail", "20"],
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result.returncode == 0:
        print("[OK] Logs du conteneur:")
        print(result.stdout)
    else:
        print(f"[ERREUR] Impossible de recuperer les logs: {result.stderr}")
except Exception as e:
    print(f"[ERREUR] {e}")

print()

# Etape 3: Verifier le statut du conteneur
print("[3/3] Verification du statut du conteneur...")
try:
    result = subprocess.run(
        ["docker", "ps", "--filter", f"name=whatsapp_{session_id}", "--format", "{{.Status}}"],
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result.returncode == 0 and result.stdout.strip():
        print(f"[OK] Conteneur actif: {result.stdout.strip()}")
    else:
        print("[ERREUR] Conteneur non trouve ou non actif")
except Exception as e:
    print(f"[ERREUR] {e}")

print()
print("=" * 60)
print("TEST TERMINE")
print("=" * 60)
