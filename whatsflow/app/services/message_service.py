"""
Message Service - Gestion de l'envoi et réception de messages WhatsApp
Connecté au moteur Baileys corrigé via le pont HTTP (bridge.js)
"""
import logging
import httpx
import uuid
import os
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

BRIDGE_HOST = os.getenv("WHATSAPP_BRIDGE_HOST", "localhost")
BRIDGE_PORT = os.getenv("OPENWA_PORT", "3010")
BRIDGE_URL = f"http://{BRIDGE_HOST}:{BRIDGE_PORT}"


class MessageService:
    """Service pour gérer l'envoi et la réception de messages WhatsApp"""

    async def send_text_message(
        self,
        session_id: str,
        to_number: str,
        message: str,
        composing_ms: Optional[int] = None
    ) -> str:
        """Envoyer un message texte via le pont Baileys"""
        try:
            logger.info(f"📤 Envoi message vers {to_number} via session {session_id}")
            timeout = 30.0 + (composing_ms or 0) / 1000

            payload = {"to": to_number, "message": message}
            if composing_ms:
                payload["composing_ms"] = composing_ms

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{BRIDGE_URL}/session/{session_id}/send-message",
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    message_id = data.get("messageId")
                    logger.info(f"✅ Message envoyé: {message_id}")
                    return message_id
                else:
                    error = response.json().get("error", response.text)
                    logger.error(f"❌ Erreur pont Baileys: {response.status_code} - {error}")
                    raise Exception(f"Erreur envoi message: {error}")

        except httpx.ConnectError:
            logger.error("❌ Impossible de contacter le pont Baileys sur port 3010")
            raise Exception("Le moteur WhatsApp n'est pas disponible. Démarrez bridge.js")
        except Exception as e:
            logger.error(f"❌ Erreur envoi message: {e}")
            raise

    async def send_media_message(
        self,
        session_id: str,
        to_number: str,
        media_type: str,
        media_url: str,
        caption: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """Envoyer un média via le pont Baileys"""
        try:
            logger.info(f"📤 Envoi média {media_type} vers {to_number} via session {session_id}")

            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "to": to_number,
                    "type": str(media_type),
                    "url": media_url
                }
                if caption:
                    payload["caption"] = caption
                if filename:
                    payload["filename"] = filename

                response = await client.post(
                    f"{BRIDGE_URL}/session/{session_id}/send-media",
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    message_id = data.get("messageId")
                    logger.info(f"✅ Média envoyé: {message_id}")
                    return message_id
                else:
                    error = response.json().get("error", response.text)
                    logger.error(f"❌ Erreur pont Baileys: {response.status_code} - {error}")
                    raise Exception(f"Erreur envoi média: {error}")

        except httpx.ConnectError:
            logger.error("❌ Impossible de contacter le pont Baileys sur port 3010")
            raise Exception("Le moteur WhatsApp n'est pas disponible. Démarrez bridge.js")
        except Exception as e:
            logger.error(f"❌ Erreur envoi média: {e}")
            raise

    async def receive_message(self, webhook_data: dict) -> None:
        """Traiter un message entrant depuis le webhook"""
        try:
            logger.info(f"📥 Message entrant: {webhook_data}")
        except Exception as e:
            logger.error(f"❌ Erreur traitement message entrant: {e}")