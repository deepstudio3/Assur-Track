-- migrations/006_templates.sql — Templates WhatsApp personnalisables par entreprise
-- Clés : J-30 / J-7 / J-0 (relances) + operation (notification de dette caisse).
-- Absence de ligne = on utilise le template par défaut côté code.

CREATE TABLE IF NOT EXISTS message_templates (
  entreprise_id UUID NOT NULL REFERENCES entreprises(id),
  cle           VARCHAR(40) NOT NULL CHECK (cle IN ('J-30', 'J-7', 'J-0', 'operation')),
  contenu       TEXT NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (entreprise_id, cle)
);
