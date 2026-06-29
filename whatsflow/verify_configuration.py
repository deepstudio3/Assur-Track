#!/usr/bin/env python3
"""
Script de vérification complète de la configuration WhatsFlow
Vérifie que tout est fonctionnel et identifie les angles morts
"""
import requests
import json
import sys

API_BASE = "http://localhost:8001"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def check_health():
    """Vérifier la santé de l'API"""
    print_section("1. HEALTH CHECK")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API en ligne")
            return True
        else:
            print(f"❌ API non accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def get_client_and_key():
    """Récupérer le client et la clé API"""
    print_section("2. RÉCUPÉRER CLIENT ET CLÉ API")
    try:
        response = requests.get(f"{API_BASE}/api/clients/", timeout=5)
        if response.status_code == 200:
            clients = response.json()
            if clients:
                client = clients[0]
                api_key = client['api_key']
                client_id = client['id']
                print(f"✅ Client trouvé: {client_id}")
                print(f"   Nom: {client['name']}")
                print(f"   Email: {client['email']}")
                print(f"   Max sessions: {client['max_sessions']}")
                return api_key, client_id
    except Exception as e:
        print(f"❌ Erreur: {e}")
    return None, None

def check_sessions(api_key):
    """Vérifier les sessions actives"""
    print_section("3. SESSIONS ACTIVES")
    try:
        response = requests.get(
            f"{API_BASE}/api/session/",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5
        )
        if response.status_code == 200:
            sessions = response.json()
            print(f"✅ {len(sessions)} session(s) trouvée(s)")
            
            if sessions:
                # Afficher la dernière session
                session = sessions[-1]
                print(f"\n   Session ID: {session['id']}")
                print(f"   Statut: {session['status']}")
                print(f"   Label: {session['session_label']}")
                print(f"   Créée: {session['created_at']}")
                
                return session['id'], api_key
        else:
            print(f"❌ Erreur: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    return None, api_key

def check_session_status(session_id, api_key):
    """Vérifier le statut détaillé de la session"""
    print_section("4. STATUT DÉTAILLÉ DE LA SESSION")
    try:
        response = requests.get(
            f"{API_BASE}/api/session/{session_id}/status",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5
        )
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Statut récupéré")
            print(f"   Connecté: {status.get('connected', False)}")
            print(f"   Numéro: {status.get('phone_number', 'N/A')}")
            print(f"   Santé: {status.get('session_health', 'N/A')}")
            print(f"   Dernier actif: {status.get('last_active', 'N/A')}")
            print(f"   Messages aujourd'hui: {status.get('messages_today', 0)}")
            
            return status.get('connected', False)
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    return False

def check_docker_containers():
    """Vérifier les conteneurs Docker"""
    print_section("5. CONTENEURS DOCKER")
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "table {{.Names}}\t{{.Status}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            print("✅ Conteneurs Docker:")
            for line in lines:
                if 'whatsflow' in line or 'whatsapp_sess' in line:
                    print(f"   {line}")
        else:
            print(f"❌ Erreur Docker: {result.stderr}")
    except Exception as e:
        print(f"❌ Erreur: {e}")

def check_database():
    """Vérifier la base de données"""
    print_section("6. BASE DE DONNÉES")
    try:
        # Tester la connexion via l'API
        response = requests.get(f"{API_BASE}/api/clients/", timeout=5)
        if response.status_code == 200:
            print("✅ PostgreSQL connectée et fonctionnelle")
        else:
            print(f"❌ Erreur base de données: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur: {e}")

def check_redis():
    """Vérifier Redis"""
    print_section("7. REDIS CACHE")
    try:
        import subprocess
        result = subprocess.run(
            ["docker", "exec", "whatsflow_redis", "redis-cli", "ping"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and "PONG" in result.stdout:
            print("✅ Redis fonctionnel")
        else:
            print(f"❌ Redis non accessible")
    except Exception as e:
        print(f"⚠️  Redis non vérifiable: {e}")

def check_angles_morts(api_key, session_id, is_connected):
    """Identifier les angles morts potentiels"""
    print_section("8. ANALYSE DES ANGLES MORTS")
    
    issues = []
    
    # Vérifier la connexion
    if not is_connected:
        issues.append("⚠️ Session non connectée - Vérifiez que le scan QR a été effectué correctement")
    
    # Vérifier les endpoints d'envoi de messages
    if is_connected and session_id and api_key:
        print("   Vérification des endpoints d'envoi...")
        
        # Test envoi message
        try:
            response = requests.post(
                f"{API_BASE}/api/session/{session_id}/send-message",
                json={"to": "237600000000", "message": "Test"},
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=5
            )
            if response.status_code == 200:
                print("   ✅ Endpoint send-message fonctionnel")
            else:
                issues.append(f"⚠️ Endpoint send-message retourne {response.status_code}")
        except Exception as e:
            issues.append(f"⚠️ Erreur send-message: {str(e)}")
        
        # Test envoi image
        try:
            response = requests.post(
                f"{API_BASE}/api/session/{session_id}/send-media",
                json={
                    "to": "237600000000",
                    "type": "image",
                    "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    "caption": "Test"
                },
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=5
            )
            if response.status_code == 200:
                print("   ✅ Endpoint send-media fonctionnel")
            else:
                issues.append(f"⚠️ Endpoint send-media retourne {response.status_code}")
        except Exception as e:
            issues.append(f"⚠️ Erreur send-media: {str(e)}")
    
    # Vérifier les ports disponibles
    print("   Vérification des ports...")
    try:
        import subprocess
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "3010" in result.stdout or "3011" in result.stdout:
            print("   ✅ Ports WhatsApp (3010+) alloués")
        else:
            issues.append("⚠️ Aucun port WhatsApp alloué - Vérifiez les conteneurs")
    except Exception as e:
        print(f"   ⚠️ Impossible de vérifier les ports: {e}")
    
    if issues:
        print("\n   Problèmes identifiés:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("\n   ✅ Aucun angle mort détecté!")
    
    return len(issues) == 0

def main():
    """Fonction principale"""
    print("\n" + "="*70)
    print("  🔍 VÉRIFICATION COMPLÈTE DE LA CONFIGURATION WHATSFLOW")
    print("="*70)
    
    # Étape 1: Health check
    if not check_health():
        print("\n❌ L'API n'est pas accessible. Arrêt.")
        return
    
    # Étape 2: Récupérer client et clé
    api_key, client_id = get_client_and_key()
    if not api_key:
        print("\n❌ Impossible de récupérer le client. Arrêt.")
        return
    
    # Étape 3: Vérifier les sessions
    session_id, api_key = check_sessions(api_key)
    if not session_id:
        print("\n❌ Aucune session trouvée. Arrêt.")
        return
    
    # Étape 4: Vérifier le statut de la session
    is_connected = check_session_status(session_id, api_key)
    
    # Étape 5: Vérifier Docker
    check_docker_containers()
    
    # Étape 6: Vérifier la base de données
    check_database()
    
    # Étape 7: Vérifier Redis
    check_redis()
    
    # Étape 8: Analyser les angles morts
    all_good = check_angles_morts(api_key, session_id, is_connected)
    
    # Résumé final
    print_section("RÉSUMÉ FINAL")
    if all_good and is_connected:
        print("✅ CONFIGURATION CORRECTE ET FONCTIONNELLE!")
        print("   • API en ligne")
        print("   • Session connectée")
        print("   • Tous les endpoints fonctionnels")
        print("   • Aucun angle mort détecté")
    elif all_good:
        print("⚠️ CONFIGURATION CORRECTE MAIS SESSION NON CONNECTÉE")
        print("   • Scannez le QR code avec WhatsApp pour connecter la session")
    else:
        print("⚠️ PROBLÈMES DÉTECTÉS - Voir ci-dessus")

if __name__ == "__main__":
    main()
