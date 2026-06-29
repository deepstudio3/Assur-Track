-- migrations/003_whatsapp.sql — Connexion WhatsApp (WhatsFlow) par entreprise
--
-- L'api_key / client_id WhatsFlow sont fournis par variables d'environnement
-- (partagés pour l'instance AssurTrack). La SESSION WhatsApp, elle, est propre
-- à chaque entreprise : on la crée quand la patronne scanne le QR code, puis on
-- mémorise son identifiant pour pouvoir envoyer les messages ensuite.

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS wa_session_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS wa_phone      VARCHAR(30),
  ADD COLUMN IF NOT EXISTS wa_status     VARCHAR(20) DEFAULT 'disconnected'
    CHECK (wa_status IN ('disconnected', 'connecting', 'connected'));
