"""
Session Manager - Gestion des sessions WhatsApp
Connecté au moteur Baileys corrigé via le pont HTTP (bridge.js)
"""
import logging
import httpx
import os
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

BRIDGE_HOST = os.getenv("WHATSAPP_BRIDGE_HOST", "localhost")
BRIDGE_PORT = os.getenv("OPENWA_PORT", "3010")
BRIDGE_URL = f"http://{BRIDGE_HOST}:{BRIDGE_PORT}"


class SessionManager:
    """Gestionnaire de sessions WhatsApp via le pont Baileys"""

    def __init__(self):
        self.bridge_url = BRIDGE_URL
        logger.info(f"✅ SessionManager initialisé → pont Baileys sur {BRIDGE_URL}")

    async def create_session(self, session_id: str, phone_number: Optional[str] = None) -> str:
        """
        Créer une nouvelle session WhatsApp.
        Si phone_number est fourni → connexion par code d'appairage (le QR n'est
        pas généré). Sinon → connexion par QR code (comportement par défaut).
        Retourne le QR code (ou un placeholder en mode appairage).
        """
        logger.info(f"🔌 Création session: {session_id}{f' (appairage {phone_number})' if phone_number else ''}")

        try:
            payload = {"sessionId": session_id}
            if phone_number:
                payload["phone_number"] = phone_number

            async with httpx.AsyncClient(timeout=10.0) as client:

                # 1) Demander au pont de démarrer la session
                response = await client.post(
                    f"{self.bridge_url}/session/create",
                    json=payload
                )

                if response.status_code != 200:
                    raise Exception(f"Erreur démarrage session: {response.text}")

                logger.info(f"✅ Session {session_id} en cours de démarrage...")

            # En mode appairage, pas de QR à récupérer : le code est récupéré
            # séparément via get_pairing_code() / l'endpoint /pairing-code.
            if phone_number:
                return self._get_placeholder_qr()

            # 2) Attendre et récupérer le QR code (jusqu'à 60 secondes)
            import asyncio
            for attempt in range(20):
                await asyncio.sleep(3)
                logger.info(f"⏳ Tentative {attempt+1}/20 récupération QR pour {session_id}...")

                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        qr_response = await client.get(
                            f"{self.bridge_url}/session/{session_id}/qr"
                        )

                        if qr_response.status_code == 200:
                            data = qr_response.json()
                            qr = data.get("qr")
                            if qr:
                                logger.info(f"✅ QR code récupéré pour {session_id}")
                                return qr

                        # Si déjà connecté (QR non dispo)
                        elif qr_response.status_code == 404:
                            status = await self.check_session_status(session_id)
                            if status:
                                logger.info(f"✅ Session {session_id} déjà connectée")
                                return self._get_placeholder_qr()

                except Exception as e:
                    logger.debug(f"Tentative {attempt+1} échouée: {e}")

            logger.warning(f"⚠️ Timeout QR pour {session_id}, retour placeholder")
            return self._get_placeholder_qr()

        except httpx.ConnectError:
            logger.error("❌ Pont Baileys non disponible sur port 3010")
            logger.error("   → Lance d'abord: node bridge.js dans whatsapp-engine/")
            return self._get_placeholder_qr()
        except Exception as e:
            logger.error(f"❌ Erreur création session {session_id}: {e}")
            return self._get_placeholder_qr()

    async def get_pairing_code(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupérer le code d'appairage frais depuis le bridge.
        Retourne un dict {code, phone, expires_in} ou None si pas encore prêt.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.bridge_url}/session/{session_id}/pairing-code"
                )
                if response.status_code == 200:
                    return response.json()
            return None
        except Exception as e:
            logger.debug(f"Code d'appairage pas encore prêt pour {session_id}: {e}")
            return None

    async def check_session_status(self, session_id: str) -> bool:
        """Vérifier si une session est connectée"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.bridge_url}/session/{session_id}/status"
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("connected", False) or data.get("isConnected", False)
            return False
        except Exception:
            return False

    async def stop_session(self, session_id: str) -> None:
        """Arrêter une session"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.delete(
                    f"{self.bridge_url}/session/{session_id}"
                )
            logger.info(f"✅ Session {session_id} arrêtée")
        except Exception as e:
            logger.error(f"❌ Erreur arrêt session {session_id}: {e}")

    async def restart_session(self, session_id: str) -> None:
        """Redémarrer une session"""
        await self.stop_session(session_id)
        import asyncio
        await asyncio.sleep(2)
        await self.create_session(session_id)

    async def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Récupérer toutes les sessions actives"""
        return {}

    async def cleanup_expired_sessions(self):
        """Nettoyer les sessions expirées"""
        pass

    def _get_placeholder_qr(self) -> str:
        """QR code placeholder"""
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII="