-- migrations/002_compta.sql
-- Remboursements partiels de la caisse + module Comptabilité (ventes & dettes clients)

-- =====================================================================
-- 1) Remboursements de la caisse patronne (tranches versées aux secrétaires)
--    Journal append-only : le statut des dettes est dérivé (allocation FIFO).
-- =====================================================================
CREATE TABLE IF NOT EXISTS remboursements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id),
  secretaire_id UUID REFERENCES users(id),       -- créancière (à qui on rembourse)
  montant       DECIMAL(15,2) NOT NULL CHECK (montant > 0),
  par           UUID REFERENCES users(id),        -- patronne qui verse
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_remboursements_sec ON remboursements(secretaire_id);
CREATE INDEX IF NOT EXISTS idx_remboursements_ent ON remboursements(entreprise_id);

CREATE OR REPLACE FUNCTION protect_remboursements()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal des remboursements est immuable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_remboursements ON remboursements;
CREATE TRIGGER trg_protect_remboursements
  BEFORE UPDATE OR DELETE ON remboursements
  FOR EACH ROW EXECUTE FUNCTION protect_remboursements();

-- =====================================================================
-- 2) Catalogue produits
-- =====================================================================
CREATE TABLE IF NOT EXISTS produits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id),
  nom           VARCHAR(100) NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL CHECK (prix_unitaire >= 0),
  categorie     VARCHAR(50) DEFAULT 'boisson',
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produits_entreprise ON produits(entreprise_id);

-- =====================================================================
-- 3) Ventes + lignes (immuables sur le montant) + paiements de dette
-- =====================================================================
CREATE TABLE IF NOT EXISTS ventes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id   UUID REFERENCES entreprises(id),
  secretaire_id   UUID REFERENCES users(id),
  montant_total   DECIMAL(10,2) NOT NULL CHECK (montant_total >= 0),
  mode_paiement   VARCHAR(20) NOT NULL CHECK (mode_paiement IN ('comptant', 'credit')),
  statut          VARCHAR(20) DEFAULT 'payee' CHECK (statut IN ('payee', 'en_attente')),
  client_nom      VARCHAR(100),
  client_prenom   VARCHAR(100),
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ventes_secretaire ON ventes(secretaire_id);
CREATE INDEX IF NOT EXISTS idx_ventes_statut     ON ventes(statut);
CREATE INDEX IF NOT EXISTS idx_ventes_created    ON ventes(created_at);
CREATE INDEX IF NOT EXISTS idx_ventes_entreprise ON ventes(entreprise_id);

CREATE TABLE IF NOT EXISTS ventes_lignes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id      UUID REFERENCES ventes(id),
  produit_id    UUID REFERENCES produits(id),
  produit_nom   VARCHAR(100) NOT NULL,            -- snapshot lisible
  quantite      INTEGER NOT NULL CHECK (quantite > 0),
  prix_unitaire DECIMAL(10,2) NOT NULL,           -- snapshot du prix
  sous_total    DECIMAL(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ventes_lignes_vente ON ventes_lignes(vente_id);

CREATE TABLE IF NOT EXISTS paiements_dette (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id    UUID REFERENCES ventes(id),
  montant     DECIMAL(10,2) NOT NULL CHECK (montant > 0),
  paye_par    UUID REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paiements_vente ON paiements_dette(vente_id);

-- Immuabilité des ventes : pas de DELETE ; montant/lignes/auteur figés (statut modifiable).
CREATE OR REPLACE FUNCTION protect_ventes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'Suppression interdite : les ventes sont immuables';
  END IF;
  IF (NEW.montant_total IS DISTINCT FROM OLD.montant_total) OR
     (NEW.secretaire_id IS DISTINCT FROM OLD.secretaire_id) OR
     (NEW.mode_paiement IS DISTINCT FROM OLD.mode_paiement) OR
     (NEW.created_at    IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Modification interdite : montant/auteur/mode d''une vente sont figés';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_ventes ON ventes;
CREATE TRIGGER trg_protect_ventes
  BEFORE UPDATE OR DELETE ON ventes
  FOR EACH ROW EXECUTE FUNCTION protect_ventes();

-- Lignes et paiements : append-only.
CREATE OR REPLACE FUNCTION protect_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Enregistrement immuable (append-only)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_ventes_lignes ON ventes_lignes;
CREATE TRIGGER trg_protect_ventes_lignes
  BEFORE UPDATE OR DELETE ON ventes_lignes
  FOR EACH ROW EXECUTE FUNCTION protect_append_only();

DROP TRIGGER IF EXISTS trg_protect_paiements ON paiements_dette;
CREATE TRIGGER trg_protect_paiements
  BEFORE UPDATE OR DELETE ON paiements_dette
  FOR EACH ROW EXECUTE FUNCTION protect_append_only();
