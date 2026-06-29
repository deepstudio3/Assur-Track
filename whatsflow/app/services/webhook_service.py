"""
Webhook Service - Notifie les clients SaaS des événements WhatsApp
"""
import logging
import httpx
import hmac
import hashlib
import json
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class WebhookService:
    """Service pour envoyer les webhooks aux clients SaaS"""

    async def send_webhook(
        self,
        webhook_url: str,
        event_type: str,
        payload: dict,
        webhook_secret: Optional[str] = None
    ) -> bool:
        """
        Envoyer un webhook vers l'URL du client.
        
        Args:
            webhook_url: URL du client à notifier
            event_type: Type d'événement (message_received, connected, etc.)
            payload: Données de l'événement
            webhook_secret: Secret pour signer le webhook
            
        Returns:
            True si envoyé avec succès, False sinon
        """
        body = {
            "event": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": payload
        }

        body_str = json.dumps(body, ensure_ascii=False)
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "WhatsFlow-Webhook/2.0",
            "X-WhatsFlow-Event": event_type,
        }

        # Ajouter la signature HMAC si un secret est configuré
        if webhook_secret:
            signature = hmac.new(
                webhook_secret.encode(),
                body_str.encode(),
                hashlib.sha256
            ).hexdigest()
            headers["X-WhatsFlow-Signature"] = f"sha256={signature}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    webhook_url,
                    content=body_str,
                    headers=headers
                )

                if response.status_code < 300:
                    logger.info(
                        f"[Webhook] ✅ Envoyé {event_type} vers {webhook_url}: "
                        f"{response.status_code}"
                    )
                    return True
                else:
                    logger.warning(
                        f"[Webhook] ⚠️ Réponse inattendue {event_type} vers {webhook_url}: "
                        f"{response.status_code} - {response.text[:100]}"
                    )
                    return False

        except httpx.ConnectError:
            logger.error(f"[Webhook] ❌ Impossible de joindre: {webhook_url}")
            return False
        except httpx.TimeoutException:
            logger.error(f"[Webhook] ❌ Timeout vers: {webhook_url}")
            return False
        except Exception as e:
            logger.error(f"[Webhook] ❌ Erreur: {e}")
            return False

    async def notify_message_received(
        self,
        webhook_url: str,
        session_id: str,
        from_number: str,
        message_text: str,
        message_id: str,
        timestamp: any,
        webhook_secret: Optional[str] = None,
        from_clean: Optional[str] = None,
        from_type: Optional[str] = None,
        sender_pn: Optional[str] = None,
        push_name: Optional[str] = None,
    ) -> bool:
        """Notifier le client d'un message reçu.

        La résolution LID → numéro est faite en amont par le moteur (stratégie
        senderPn + cache Postgres). On utilise `from_clean`/`from_type` fournis si
        présents, et on ne retombe sur le strip naïf que pour la compatibilité
        ascendante. `push_name` = nom WhatsApp affiché par le contact.
        """
        # Fallback rétro-compatible si le moteur n'a pas fourni la résolution
        if not from_clean:
            from_clean = (
                from_number.replace("@s.whatsapp.net", "")
                .replace("@g.us", "")
                .replace("@lid", "")
            )
        if not from_type:
            from_type = (
                "group" if "@g.us" in from_number
                else "lid" if "@lid" in from_number
                else "phone"
            )

        return await self.send_webhook(
            webhook_url=webhook_url,
            event_type="message_received",
            payload={
                "session_id": session_id,
                "from": from_number,
                "from_clean": from_clean,
                "from_type": from_type,
                # Numéro réel (@s.whatsapp.net) quand WhatsApp l'a fourni, sinon ""
                "sender_pn": sender_pn or "",
                # Nom WhatsApp du contact (pour affichage interface), sinon ""
                "push_name": push_name or "",
                "name": push_name or "",
                "message_id": message_id,
                "text": message_text,
                "timestamp": str(timestamp),
                "is_group": from_type in ("group", "group_phone") or "@g.us" in from_number
            },
            webhook_secret=webhook_secret
        )

    async def notify_session_connected(
        self,
        webhook_url: str,
        session_id: str,
        phone_number: str,
        webhook_secret: Optional[str] = None
    ) -> bool:
        """Notifier le client qu'une session est connectée"""
        return await self.send_webhook(
            webhook_url=webhook_url,
            event_type="session_connected",
            payload={
                "session_id": session_id,
                "phone_number": phone_number,
            },
            webhook_secret=webhook_secret
        )

    async def notify_session_disconnected(
        self,
        webhook_url: str,
        session_id: str,
        reason: Optional[str] = None,
        webhook_secret: Optional[str] = None
    ) -> bool:
        """Notifier le client qu'une session est déconnectée"""
        return await self.send_webhook(
            webhook_url=webhook_url,
            event_type="session_disconnected",
            payload={
                "session_id": session_id,
                "reason": reason or "unknown"
            },
            webhook_secret=webhook_secret
        )