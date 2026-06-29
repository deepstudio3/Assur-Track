"""
Endpoints pour l'envoi et la réception de messages WhatsApp
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.models.client import Client
from app.models.session import Session, SessionStatus
from app.models.message import Message, MessageDirection, MessageType, MessageStatus
from app.schemas.message import SendMessageRequest, SendMediaRequest, MessageResponse
from app.api.dependencies import get_current_client
from app.services.message_service import MessageService
from app.services.session_manager import SessionManager

router = APIRouter()
message_service = MessageService()
session_manager = SessionManager()


@router.post("/{session_id}/send-message", response_model=MessageResponse)
async def send_message(
    session_id: str,
    message_data: SendMessageRequest,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """Envoyer un message texte via une session WhatsApp"""

    # Vérifier que la session existe et appartient au client
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

    # Vérifier via bridge.js (source de vérité)
    is_really_connected = await session_manager.check_session_status(session_id)

    # Synchroniser le statut en DB si nécessaire
    if is_really_connected and session.status != SessionStatus.CONNECTED:
        session.status = SessionStatus.CONNECTED
        session.last_active = datetime.utcnow()
        await db.commit()
        await db.refresh(session)

    if not is_really_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session non connectée. Scanne le QR code d'abord."
        )

    # Créer l'enregistrement du message
    new_message = Message(
        session_id=session_id,
        direction=MessageDirection.OUTBOUND,
        message_type=MessageType.TEXT,
        status=MessageStatus.PENDING,
        to_number=message_data.to,
        content=message_data.message
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    # Envoyer le message via le service
    try:
        whatsapp_msg_id = await message_service.send_text_message(
            session_id=session_id,
            to_number=message_data.to,
            message=message_data.message,
            composing_ms=message_data.composing_ms
        )

        new_message.status = MessageStatus.SENT
        new_message.whatsapp_message_id = whatsapp_msg_id
        session.messages_sent += 1
        session.last_active = datetime.utcnow()

        await db.commit()
        await db.refresh(new_message)

    except Exception as e:
        new_message.status = MessageStatus.FAILED
        new_message.error_message = str(e)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi du message: {str(e)}"
        )

    return MessageResponse(
        status="sent",
        message_id=new_message.id,
        timestamp=new_message.created_at
    )


@router.post("/{session_id}/send-media", response_model=MessageResponse)
async def send_media(
    session_id: str,
    media_data: SendMediaRequest,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """Envoyer un média via une session WhatsApp"""

    # Vérifier que la session existe et appartient au client
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

    # Vérifier via bridge.js (source de vérité)
    is_really_connected = await session_manager.check_session_status(session_id)

    # Synchroniser le statut en DB si nécessaire
    if is_really_connected and session.status != SessionStatus.CONNECTED:
        session.status = SessionStatus.CONNECTED
        session.last_active = datetime.utcnow()
        await db.commit()
        await db.refresh(session)

    if not is_really_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session non connectée. Scanne le QR code d'abord."
        )

    # Créer l'enregistrement du message
    new_message = Message(
        session_id=session_id,
        direction=MessageDirection.OUTBOUND,
        message_type=media_data.type,
        status=MessageStatus.PENDING,
        to_number=media_data.to,
        content=media_data.caption,
        media_url=media_data.url
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    # Envoyer le média via le service
    try:
        whatsapp_msg_id = await message_service.send_media_message(
            session_id=session_id,
            to_number=media_data.to,
            media_type=media_data.type,
            media_url=media_data.url,
            caption=media_data.caption,
            filename=media_data.filename
        )

        new_message.status = MessageStatus.SENT
        new_message.whatsapp_message_id = whatsapp_msg_id
        session.messages_sent += 1
        session.last_active = datetime.utcnow()

        await db.commit()
        await db.refresh(new_message)

    except Exception as e:
        new_message.status = MessageStatus.FAILED
        new_message.error_message = str(e)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi du média: {str(e)}"
        )

    return MessageResponse(
        status="sent",
        message_id=new_message.id,
        timestamp=new_message.created_at
    )