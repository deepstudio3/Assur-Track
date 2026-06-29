-- Table d'auth-state Baileys (stockée en PostgreSQL par le moteur WhatsApp).
-- Le moteur lit/écrit ici les credentials cryptographiques de chaque session ;
-- elle n'est pas créée automatiquement par le code, on l'initialise donc ici.
CREATE TABLE IF NOT EXISTS whatsapp_auth_state (
    session_id   VARCHAR(255) NOT NULL,
    key_type     VARCHAR(100) NOT NULL,
    key_data     JSONB        NOT NULL,
    updated_at   TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY (session_id, key_type)
);

CREATE INDEX IF NOT EXISTS idx_auth_session ON whatsapp_auth_state(session_id);
