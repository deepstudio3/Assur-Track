-- migrations/004_chassis.sql — Numéro de châssis (assurance automobile)
-- Champ facultatif, renseigné pour les contrats Automobile. Réinjecté dans les
-- relances WhatsApp pour que le client identifie sans ambiguïté son véhicule.

ALTER TABLE contrats
  ADD COLUMN IF NOT EXISTS numero_chassis VARCHAR(50);
