import { query } from '../../config/database.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

function shape(row) {
  return {
    id: row.id,
    nom: row.nom,
    prix_unitaire: row.prix_unitaire,
    categorie: row.categorie,
    actif: row.actif,
  };
}

export async function list(entrepriseId, { actifsOnly = false } = {}) {
  const where = ['entreprise_id = $1'];
  if (actifsOnly) where.push('actif = TRUE');
  const { rows } = await query(
    `SELECT * FROM produits WHERE ${where.join(' AND ')} ORDER BY categorie, nom`,
    [entrepriseId],
  );
  return rows.map(shape);
}

export async function create({ nom, prix_unitaire, categorie }, entrepriseId) {
  if (!nom?.trim() || !(Number(prix_unitaire) >= 0)) {
    throw new BadRequestError('Nom et prix valides requis');
  }
  const { rows } = await query(
    `INSERT INTO produits (entreprise_id, nom, prix_unitaire, categorie)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [entrepriseId, nom.trim(), Number(prix_unitaire), categorie || 'boisson'],
  );
  return shape(rows[0]);
}

export async function update(id, payload, entrepriseId) {
  const fields = [];
  const params = [];
  for (const key of ['nom', 'prix_unitaire', 'categorie', 'actif']) {
    if (payload[key] !== undefined) {
      params.push(payload[key]);
      fields.push(`${key} = $${params.length}`);
    }
  }
  if (!fields.length) throw new BadRequestError('Aucune modification fournie');
  params.push(id, entrepriseId);
  const { rows } = await query(
    `UPDATE produits SET ${fields.join(', ')}
     WHERE id = $${params.length - 1} AND entreprise_id = $${params.length} RETURNING *`,
    params,
  );
  if (!rows[0]) throw new NotFoundError('Produit introuvable');
  return shape(rows[0]);
}
