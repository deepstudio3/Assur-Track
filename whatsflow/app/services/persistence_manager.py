import os
import logging
from typing import Optional, Dict, Any
import redis
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class HybridPersistenceManager:
    """
    Gestionnaire de persistance hybride pour les sessions WhatsApp
    - Redis: État temporaire (QR codes, statuts)
    - PostgreSQL: Métadonnées persistantes
    - Docker Volumes: Stockage local des sessions
    """
    
    def __init__(self, redis_url: str = "redis://redis:6379"):
        self.redis_client = None
        self.redis_url = redis_url
        self._connect_redis()
    
    def _connect_redis(self):
        """Connexion à Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info("✅ Redis client connected")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis_client = None
    
    async def store_qr_code(self, session_id: str, qr_code: str, ttl_seconds: int = 300):
        """Stocker un QR code dans Redis avec TTL"""
        if not self.redis_client:
            logger.warning("⚠️ Redis not available, skipping QR storage")
            return
        
        try:
            key = f"qr:{session_id}"
            self.redis_client.setex(key, ttl_seconds, qr_code)
            logger.info(f"✅ QR code stored for session {session_id} (TTL: {ttl_seconds}s)")
        except Exception as e:
            logger.error(f"❌ Error storing QR code: {e}")
    
    async def get_qr_code(self, session_id: str) -> Optional[str]:
        """Récupérer un QR code depuis Redis"""
        if not self.redis_client:
            return None
        
        try:
            key = f"qr:{session_id}"
            return self.redis_client.get(key)
        except Exception as e:
            logger.error(f"❌ Error retrieving QR code: {e}")
            return None
    
    async def store_session_status(self, session_id: str, status: Dict[str, Any], ttl_seconds: int = 86400):
        """Stocker le statut d'une session dans Redis"""
        if not self.redis_client:
            return
        
        try:
            key = f"status:{session_id}"
            status_json = json.dumps(status)
            self.redis_client.setex(key, ttl_seconds, status_json)
            logger.info(f"✅ Session status stored for {session_id}")
        except Exception as e:
            logger.error(f"❌ Error storing session status: {e}")
    
    async def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Récupérer le statut d'une session depuis Redis"""
        if not self.redis_client:
            return None
        
        try:
            # Vérifier d'abord le format Baileys (session:{sessionId}:status)
            baileys_key = f"session:{session_id}:status"
            status_value = self.redis_client.get(baileys_key)
            
            if status_value:
                # Baileys stocke juste le statut en string ('connected', 'disconnected', etc.)
                return {
                    'connected': status_value == 'connected',
                    'status': status_value
                }
            
            # Fallback au format persistence_manager (status:{session_id})
            key = f"status:{session_id}"
            status_json = self.redis_client.get(key)
            if status_json:
                return json.loads(status_json)
            
            return None
        except Exception as e:
            logger.error(f"❌ Error retrieving session status: {e}")
            return None
    
    async def store_session_metadata(self, session_id: str, metadata: Dict[str, Any]):
        """Stocker les métadonnées de session dans Redis"""
        if not self.redis_client:
            return
        
        try:
            key = f"metadata:{session_id}"
            metadata_json = json.dumps(metadata)
            self.redis_client.set(key, metadata_json)
            logger.info(f"✅ Session metadata stored for {session_id}")
        except Exception as e:
            logger.error(f"❌ Error storing session metadata: {e}")
    
    async def get_session_metadata(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Récupérer les métadonnées de session depuis Redis"""
        if not self.redis_client:
            return None
        
        try:
            key = f"metadata:{session_id}"
            metadata_json = self.redis_client.get(key)
            if metadata_json:
                return json.loads(metadata_json)
            return None
        except Exception as e:
            logger.error(f"❌ Error retrieving session metadata: {e}")
            return None
    
    async def cleanup_expired_sessions(self):
        """Nettoyer les sessions expirées"""
        if not self.redis_client:
            return
        
        try:
            # Récupérer toutes les clés de sessions
            pattern = "status:*"
            keys = self.redis_client.keys(pattern)
            
            expired_count = 0
            for key in keys:
                ttl = self.redis_client.ttl(key)
                if ttl == -1:  # Pas de TTL défini
                    self.redis_client.expire(key, 86400)  # 24h
                elif ttl == -2:  # Expiré
                    session_id = key.split(":")[1]
                    await self.cleanup_session(session_id)
                    expired_count += 1
            
            if expired_count > 0:
                logger.info(f"🧹 Cleaned up {expired_count} expired sessions")
                
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
    
    async def cleanup_session(self, session_id: str):
        """Nettoyer toutes les données d'une session"""
        if not self.redis_client:
            return
        
        try:
            # Supprimer toutes les clés liées à la session
            patterns = [
                f"qr:{session_id}",
                f"status:{session_id}",
                f"metadata:{session_id}",
                f"phone:{session_id}",
                f"auth:{session_id}"
            ]
            
            for key in patterns:
                self.redis_client.delete(key)
            
            logger.info(f"🧹 Cleaned up session {session_id}")
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up session {session_id}: {e}")
    
    async def get_all_active_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Récupérer toutes les sessions actives"""
        if not self.redis_client:
            return {}
        
        try:
            pattern = "status:*"
            keys = self.redis_client.keys(pattern)
            
            sessions = {}
            for key in keys:
                session_id = key.split(":")[1]
                status = await self.get_session_status(session_id)
                metadata = await self.get_session_metadata(session_id)
                
                if status:
                    sessions[session_id] = {
                        "status": status,
                        "metadata": metadata or {}
                    }
            
            return sessions
            
        except Exception as e:
            logger.error(f"❌ Error retrieving active sessions: {e}")
            return {}
    
    async def update_session_health(self, session_id: str, health_data: Dict[str, Any]):
        """Mettre à jour les données de santé d'une session"""
        if not self.redis_client:
            return
        
        try:
            key = f"health:{session_id}"
            health_json = json.dumps(health_data)
            self.redis_client.setex(key, 3600, health_json)  # 1h TTL
            logger.debug(f"💓 Health data updated for {session_id}")
        except Exception as e:
            logger.error(f"❌ Error updating session health: {e}")
    
    async def get_session_health(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Récupérer les données de santé d'une session"""
        if not self.redis_client:
            return None
        
        try:
            key = f"health:{session_id}"
            health_json = self.redis_client.get(key)
            if health_json:
                return json.loads(health_json)
            return None
        except Exception as e:
            logger.error(f"❌ Error retrieving session health: {e}")
            return None
    
    async def disconnect(self):
        """Déconnexion propre de Redis"""
        if self.redis_client:
            self.redis_client.close()
            logger.info("📴 Redis client disconnected")
