"""
WhatsFlow - API Middleware WhatsApp Business
Point d'entrée principal de l'application FastAPI
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router

# Configuration du logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    # Startup
    logger.info("🚀 Démarrage de WhatsFlow API...")
    
    # Créer les tables de base de données
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("✅ Base de données initialisée")
    logger.info(f"🌍 Environnement: {settings.ENVIRONMENT}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Arrêt de WhatsFlow API...")
    await engine.dispose()


# Initialisation de l'application FastAPI
app = FastAPI(
    title="WhatsFlow API",
    description="API Middleware pour WhatsApp Business",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes principales
@app.get("/")
async def root():
    """Route racine"""
    return {
        "service": "WhatsFlow API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Vérification de santé de l'API"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT
    }


# Gestion globale des erreurs
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Gestionnaire d'erreurs global"""
    logger.error(f"Erreur non gérée: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.ENVIRONMENT == "development" else "Une erreur est survenue"
        }
    )


# Inclusion des routes API
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.ENVIRONMENT == "development"
    )
