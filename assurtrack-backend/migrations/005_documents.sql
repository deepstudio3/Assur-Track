-- migrations/005_documents.sql — Documents liés aux contrats d'assurance
-- (images et PDF : attestations, cartes grises, devis…). Les fichiers sont
-- stockés sur disque (volume), seules les métadonnées vivent en base.

CREATE TABLE IF NOT EXISTS contrat_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrat_id    UUID NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id),
  nom_fichier   VARCHAR(255) NOT NULL,   -- nom de stockage (uuid.ext)
  nom_original  VARCHAR(255) NOT NULL,   -- nom d'origine affiché
  mime_type     VARCHAR(100) NOT NULL,
  taille        INTEGER NOT NULL,
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrat_documents_contrat ON contrat_documents(contrat_id);
