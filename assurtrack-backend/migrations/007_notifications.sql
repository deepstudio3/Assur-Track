-- migrations/007_notifications.sql — Notifications in-app (cloche du frontend)
-- user_id = destinataire précis ; NULL = diffusion à toute l'entreprise.

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id),
  user_id       UUID REFERENCES users(id),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('caisse', 'relance', 'vente', 'dette')),
  titre         VARCHAR(255) NOT NULL,
  detail        TEXT,
  lu            BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_dest
  ON notifications(entreprise_id, user_id, created_at DESC);
