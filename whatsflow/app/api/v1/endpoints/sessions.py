"""
Endpoints pour la gestion des sessions WhatsApp
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime
import asyncio
import httpx
import logging

from app.core.database import get_db
from app.models.client import Client
from app.models.session import Session, SessionStatus
from app.schemas.session import SessionCreate, SessionResponse, SessionStatusResponse
from app.api.dependencies import get_current_client
from app.services.session_manager import SessionManager

router = APIRouter()
session_manager = SessionManager()
logger = logging.getLogger(__name__)


@router.post("/create", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """Créer une nouvelle session WhatsApp — retourne immédiatement"""
    logger.info(f"[endpoint] create_session pour client {current_client.id}")

    # Vérifier le quota de sessions
    result = await db.execute(
        select(func.count(Session.id)).where(
            Session.client_id == current_client.id,
            Session.status.in_([SessionStatus.AWAITING_LOGIN, SessionStatus.CONNECTED])
        )
    )
    active_sessions_count = result.scalar()

    if active_sessions_count >= current_client.max_sessions:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Quota de sessions atteint ({current_client.max_sessions} max)"
        )

    # Normaliser le numéro (mode appairage) : chiffres uniquement
    phone_number = None
    if session_data.phone_number:
        phone_number = "".join(c for c in session_data.phone_number if c.isdigit())
        if len(phone_number) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="phone_number invalide (indicatif pays + numéro attendus, ex: 237690000000)"
            )

    # Créer la session en DB
    new_session = Session(
        client_id=current_client.id,
        session_label=session_data.session_label,
        phone_number=phone_number,
        status=SessionStatus.AWAITING_LOGIN,
        qr_code=session_manager._get_placeholder_qr()
    )

    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    logger.info(f"[endpoint] Session créée en DB: {new_session.id}")

    # Démarrer Baileys en arrière-plan — ne pas bloquer la réponse.
    # Avec phone_number → connexion par code d'appairage ; sinon → QR code.
    asyncio.ensure_future(session_manager.create_session(new_session.id, phone_number))
    logger.info(f"[endpoint] Baileys démarré en arrière-plan pour {new_session.id}")

    # Retourner immédiatement — le QR arrivera via webhook qr_ready
    return new_session


@router.get("/{session_id}/qr")
async def get_session_qr(
    session_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupérer le QR code frais depuis le bridge.
    Appeler toutes les 3 secondes jusqu'à obtenir status='qr_ready'.
    """
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.client_id == current_client.id
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )

    # Récupérer le QR frais depuis le bridge
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"http://whatsapp-engine:3010/session/{session_id}/qr"
            )

            if response.status_code == 200:
                data = response.json()

                # Déjà connecté
                if data.get("status") == "already_connected":
                    return {
                        "session_id": session_id,
                        "status": "connected",
                        "qr_code": None
                    }

                # QR disponible
                qr = data.get("qr")
                if qr:
                    # Mettre à jour en DB
                    session.qr_code = qr
                    await db.commit()
                    return {
                        "session_id": session_id,
                        "status": "qr_ready",
                        "qr_code": qr,
                        "expires_in": data.get("expires_in", 300)
                    }

    except Exception as e:
        logger.error(f"Erreur récupération QR bridge: {e}")

    # Pas encore prêt
    return {
        "session_id": session_id,
        "status": "starting",
        "qr_code": None,
        "message": "Session en démarrage, réessaie dans 3 secondes"
    }


@router.get("/{session_id}/pairing-code")
async def get_session_pairing_code(
    session_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupérer le code d'appairage (connexion par numéro de téléphone).
    Appeler toutes les 3 secondes jusqu'à obtenir status='pairing_ready'.
    Le client saisit ce code dans WhatsApp →
    Appareils connectés → Lier un appareil → Lier avec un numéro de téléphone.
    """
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.client_id == current_client.id
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )

    data = await session_manager.get_pairing_code(session_id)

    if data:
        # Déjà connecté
        if data.get("status") == "already_connected":
            return {
                "session_id": session_id,
                "status": "connected",
                "code": None
            }

        code = data.get("code")
        if code:
            return {
                "session_id": session_id,
                "status": "pairing_ready",
                "code": code,
                "phone": data.get("phone"),
                "expires_in": data.get("expires_in", 180)
            }

    # Pas encore prêt
    return {
        "session_id": session_id,
        "status": "starting",
        "code": None,
        "message": "Code en préparation, réessaie dans 3 secondes"
    }


@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """Vérifier l'état d'une session"""
    logger.info(f"Getting session status: session_id={session_id}")

    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.client_id == current_client.id
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )

    # Vérifier via bridge (source de vérité)
    is_connected = await session_manager.check_session_status(session_id)

    # Synchroniser le statut en DB
    if is_connected and session.status != SessionStatus.CONNECTED:
        session.status = SessionStatus.CONNECTED
        session.last_active = datetime.utcnow()
        await db.commit()
        await db.refresh(session)
    elif not is_connected and session.status == SessionStatus.CONNECTED:
        session.status = SessionStatus.AWAITING_LOGIN
        await db.commit()
        await db.refresh(session)

    messages_today = session.messages_sent

    return SessionStatusResponse(
        connected=is_connected,
        phone_number=session.phone_number,
        client=current_client.name,
        last_active=session.last_active,
        session_health="stable" if is_connected else "disconnected",
        messages_today=messages_today
    )


@router.get("/", response_model=List[SessionResponse])
async def list_sessions(
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """Lister toutes les sessions du client"""
    result = await db.execute(
        select(Session).where(Session.client_id == current_client.id)
    )
    sessions = result.scalars().all()
    return sessions


@router.post("/{session_id}/restart")
async def restart_session(
    session_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Relancer le cycle de connexion d'une session non connectée pour obtenir un
    nouveau QR code. Interdit si la session est déjà connectée (409).
    Retourne immédiatement — le redémarrage Baileys s'effectue en arrière-plan.
    """
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.client_id == current_client.id
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )

    if session.status == SessionStatus.CONNECTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de relancer une session déjà connectée"
        )

    session.status = SessionStatus.AWAITING_LOGIN
    session.qr_code = session_manager._get_placeholder_qr()
    await db.commit()

    # Redémarrage en arrière-plan : stop bridge + wait + create_session (nouveau QR)
    asyncio.ensure_future(session_manager.restart_session(session_id))
    logger.info(f"[endpoint] Redémarrage session {session_id} déclenché en arrière-plan")

    return {
        "session_id": session_id,
        "status": "restarting",
        "message": "Session en cours de redémarrage, QR disponible dans ~5 secondes"
    }


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """Supprimer une session"""
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.client_id == current_client.id
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )

    await session_manager.stop_session(session_id)
    await db.delete(session)
    await db.commit()
    return None