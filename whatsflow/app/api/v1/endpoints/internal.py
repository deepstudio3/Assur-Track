"""
Endpoints internes — Communication bridge.js ↔ FastAPI
Non exposés aux clients externes
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
import logging

from app.core.database import get_db
from app.models.session import Session, SessionStatus
from app.models.client import Client
from app.services.webhook_service import WebhookService

router = APIRouter()
logger = logging.getLogger(__name__)
webhook_service = WebhookService()

INTERNAL_TOKEN = "whatsflow-internal-2026"


def verify_internal(x_internal_token: str = Header(None)):
    if x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=403, detail="Token interne invalide")


@router.post("/session/{session_id}/event")
async def receive_session_event(
    session_id: str,
    event_data: dict,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal)
):
    """Reçoit les notifications de bridge.js et met à jour la DB + notifie le client"""
    event = event_data.get("event")
    data = event_data.get("data", {})

    logger.info(f"[Internal] Événement reçu: {event} pour {session_id}")

    # Récupérer la session avec son client
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        logger.warning(f"[Internal] Session inconnue: {session_id}")
        return {"status": "ignored", "reason": "session not found"}

    # Récupérer le client pour avoir webhook_url
    client_result = await db.execute(
        select(Client).where(Client.id == session.client_id)
    )
    client = client_result.scalar_one_or_none()

    # ── Traiter selon le type d'événement ──────────────────────

    if event == "connected":
        session.status = SessionStatus.CONNECTED
        session.last_active = datetime.utcnow()
        phone = data.get("phone", "") or data.get("user", {}).get("id", "")
        if phone:
            session.phone_number = phone.split(":")[0].split("@")[0]
        await db.commit()
        logger.info(f"[Internal] ✅ Session {session_id} marquée CONNECTED")

        # Notifier le client SaaS
        if client and client.webhook_url:
            await webhook_service.notify_session_connected(
                webhook_url=client.webhook_url,
                session_id=session_id,
                phone_number=session.phone_number or "",
                webhook_secret=client.webhook_secret
            )

    elif event == "disconnected":
        session.status = SessionStatus.DISCONNECTED
        await db.commit()
        logger.info(f"[Internal] ⚠️ Session {session_id} marquée DISCONNECTED")

        if client and client.webhook_url:
            await webhook_service.notify_session_disconnected(
                webhook_url=client.webhook_url,
                session_id=session_id,
                reason=data.get("reason"),
                webhook_secret=client.webhook_secret
            )

    elif event == "logged_out":
        session.status = SessionStatus.AWAITING_LOGIN
        session.phone_number = None
        await db.commit()
        logger.info(f"[Internal] ❌ Session {session_id} déconnectée (logout)")

    elif event == "pairing_code_ready":
        # Connexion par numéro de téléphone : le moteur a généré un code d'appairage.
        # On enregistre le numéro visé ; le code reste récupéré via /pairing-code.
        phone = data.get("phone")
        if phone:
            session.phone_number = phone
        session.status = SessionStatus.AWAITING_LOGIN
        await db.commit()
        logger.info(f"[Internal] 🔑 Code d'appairage prêt pour {session_id} ({data.get('code')})")

    elif event == "qr_ready":
        qr = data.get("qr", "")
        if qr:
            session.qr_code = qr
            session.status = SessionStatus.AWAITING_LOGIN
            await db.commit()
        logger.info(f"[Internal] 📱 QR mis à jour pour {session_id}")

    elif event == "message_received":
        # Incrémenter compteur
        session.messages_received = (session.messages_received or 0) + 1
        session.last_active = datetime.utcnow()
        await db.commit()
        logger.info(f"[Internal] 📨 Message reçu de {data.get('from')} dans {session_id}")

        # Notifier le client SaaS via webhook
        if client and client.webhook_url:
            sent = await webhook_service.notify_message_received(
                webhook_url=client.webhook_url,
                session_id=session_id,
                from_number=data.get("from", ""),
                message_text=data.get("text", ""),
                message_id=data.get("message_id", ""),
                timestamp=data.get("timestamp"),
                webhook_secret=client.webhook_secret,
                # Résolution déjà faite par le moteur (senderPn + cache Postgres)
                from_clean=data.get("from_clean"),
                from_type=data.get("from_type"),
                sender_pn=data.get("sender_pn"),
                push_name=data.get("push_name"),
            )
            if sent:
                logger.info(f"[Internal] ✅ Webhook envoyé au client {client.name}")
            else:
                logger.warning(f"[Internal] ⚠️ Webhook échoué pour {client.name}")
        else:
            logger.info(f"[Internal] ℹ️ Pas de webhook configuré pour {client.name if client else 'client inconnu'}")

    return {"status": "ok", "event": event, "session_id": session_id}


@router.get("/sessions/active")
async def get_active_sessions(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal)
) -> dict:
    """Retourne les sessions qui doivent être actives"""
    result = await db.execute(
        select(Session).where(
            Session.status.in_([
                SessionStatus.CONNECTED,
                SessionStatus.AWAITING_LOGIN
            ])
        )
    )
    sessions = result.scalars().all()
    session_ids = [s.id for s in sessions]

    logger.info(f"[Internal] Sessions actives: {len(session_ids)}")
    return {"sessions": session_ids, "count": len(session_ids)}