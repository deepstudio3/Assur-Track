"""
Router principal de l'API WhatsFlow v1
"""
from fastapi import APIRouter
from app.api.v1.endpoints import clients, sessions, messages, internal

api_router = APIRouter()

# Routes publiques
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(sessions.router, prefix="/session", tags=["sessions"])
api_router.include_router(messages.router, prefix="/session", tags=["messages"])

# Routes internes (bridge.js → FastAPI uniquement)
api_router.include_router(internal.router, prefix="/internal", tags=["internal"])