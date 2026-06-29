-- migrations/001_init.sql — Schéma initial AssurTrack

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Entreprises clientes du SaaS
CREATE TABLE IF NOT EXISTS entreprises (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                   VARCHAR(255) NOT NULL,
  telephone_gerant      VARCHAR(20),
  telephone_responsable VARCHAR(20),
  created_at            TIMESTAMP DEFAULT NOW()
);

-- Utilisateurs (patronne, secrétaires, admins)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('patronne', 'secretaire', 'admin')),
  telephone_wa  VARCHAR(20),
  entreprise_id UUID REFERENCES entreprises(id),
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Clients assurés
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  telephone_wa  VARCHAR(20) NOT NULL,
  email         VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Contrats d'assurance
CREATE TABLE IF NOT EXISTS contrats (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id     UUID REFERENCES entreprises(id),
  client_id         UUID REFERENCES clients(id),
  numero_police     VARCHAR(100) UNIQUE NOT NULL,
  type_assurance    VARCHAR(100) NOT NULL,
  date_souscription DATE NOT NULL,
  date_expiration   DATE NOT NULL,
  montant_prime     DECIMAL(15,2),
  statut            VARCHAR(20) DEFAULT 'actif'
                    CHECK (statut IN ('actif', 'expire', 'renouvele', 'suspendu')),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Relances envoyées (historique complet)
CREATE TABLE IF NOT EXISTS relances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrat_id    UUID REFERENCES contrats(id),
  type_relance  VARCHAR(10) NOT NULL CHECK (type_relance IN ('J-30', 'J-7', 'J-0')),
  canal         VARCHAR(20) DEFAULT 'whatsapp',
  destinataire  VARCHAR(20) NOT NULL,
  message       TEXT NOT NULL,
  statut        VARCHAR(20) DEFAULT 'envoye' CHECK (statut IN ('envoye', 'echec', 'en_attente')),
  envoye_at     TIMESTAMP DEFAULT NOW()
);

-- Opérations caisse patronne (IMMUABLE — jamais DELETE, montant jamais modifié)
CREATE TABLE IF NOT EXISTS operations_caisse (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id   UUID REFERENCES entreprises(id),
  secretaire_id   UUID REFERENCES users(id),
  montant         DECIMAL(15,2) NOT NULL CHECK (montant > 0),
  motif           TEXT,
  statut          VARCHAR(20) DEFAULT 'du' CHECK (statut IN ('du', 'rembourse')),
  rembourse_at    TIMESTAMP,
  rembourse_par   UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_contrats_expiration  ON contrats(date_expiration);
CREATE INDEX IF NOT EXISTS idx_contrats_entreprise   ON contrats(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_operations_entreprise ON operations_caisse(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_operations_secretaire ON operations_caisse(secretaire_id);
CREATE INDEX IF NOT EXISTS idx_relances_contrat      ON relances(contrat_id);

-- =====================================================================
-- Garde-fou d'immuabilité : interdire DELETE et toute modification du
-- montant d'une opération caisse, directement au niveau de la base.
-- (Défense en profondeur : l'API n'expose déjà aucune route DELETE.)
-- =====================================================================
CREATE OR REPLACE FUNCTION protect_operations_caisse()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'Suppression interdite : le registre de caisse est immuable';
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.montant      IS DISTINCT FROM OLD.montant)      OR
       (NEW.secretaire_id IS DISTINCT FROM OLD.secretaire_id) OR
       (NEW.motif        IS DISTINCT FROM OLD.motif)        OR
       (NEW.created_at    IS DISTINCT FROM OLD.created_at) THEN
      RAISE EXCEPTION 'Modification interdite : montant/motif/auteur d''une opération sont figés';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_operations ON operations_caisse;
CREATE TRIGGER trg_protect_operations
  BEFORE UPDATE OR DELETE ON operations_caisse
  FOR EACH ROW EXECUTE FUNCTION protect_operations_caisse();
