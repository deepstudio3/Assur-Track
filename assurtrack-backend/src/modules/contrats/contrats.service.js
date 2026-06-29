import { query, withTransaction } from '../../config/database.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

const SELECT_BASE = `
  SELECT c.*,
         cl.nom AS client_nom, cl.prenom AS client_prenom,
         cl.telephone_wa AS client_telephone, cl.email AS client_email,
         (c.date_expiration - CURRENT_DATE) AS jours_restants
  FROM contrats c
  JOIN clients cl ON cl.id = c.client_id
`;

function shape(row) {
  return {
    id: row.id,
    numero_police: row.numero_police,
    type_assurance: row.type_assurance,
    date_souscription: row.date_souscription,
    date_expiration: row.date_expiration,
    montant_prime: row.montant_prime,
    statut: row.statut,
    jours_restants: row.jours_restants,
    client: {
      id: row.client_id,
      nom: row.client_nom,
      prenom: row.client_prenom,
      telephone_wa: row.client_telephone,
      email: row.client_email,
    },
  };
}

export async function list({ entrepriseId, statut, q, page = 1, limit = 20 }) {
  const where = ['c.entreprise_id = $1'];
  const params = [entrepriseId];

  if (statut) {
    params.push(statut);
    where.push(`c.statut = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(cl.nom ILIKE $${params.length} OR cl.prenom ILIKE $${params.length} OR c.numero_police ILIKE $${params.length})`,
    );
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (Math.max(1, page) - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM contrats c JOIN clients cl ON cl.id = c.client_id ${whereSql}`, params);

  const rowsRes = await query(
    `${SELECT_BASE} ${whereSql} ORDER BY c.date_expiration ASC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data: rowsRes.rows.map(shape),
    pagination: { page: Number(page), limit: Number(limit), total: countRes.rows[0].total },
  };
}

export async function getById(id, entrepriseId) {
  const { rows } = await query(`${SELECT_BASE} WHERE c.id = $1 AND c.entreprise_id = $2`, [id, entrepriseId]);
  if (!rows[0]) throw new NotFoundError('Contrat introuvable');
  return shape(rows[0]);
}

/**
 * Crée un contrat. Réutilise un client existant (même téléphone) sinon le crée.
 */
export async function create(payload, { userId, entrepriseId }) {
  const {
    client = {},
    numero_police,
    type_assurance,
    date_souscription,
    date_expiration,
    montant_prime,
  } = payload;

  if (!numero_police || !type_assurance || !date_souscription || !date_expiration) {
    throw new BadRequestError('Champs contrat obligatoires manquants');
  }
  if (!client.nom || !client.prenom || !client.telephone_wa) {
    throw new BadRequestError('Informations client obligatoires manquantes');
  }

  return withTransaction(async (tx) => {
    const existing = await tx.query(
      `SELECT id FROM clients WHERE entreprise_id = $1 AND telephone_wa = $2`,
      [entrepriseId, client.telephone_wa],
    );

    let clientId = existing.rows[0]?.id;
    if (!clientId) {
      const created = await tx.query(
        `INSERT INTO clients (entreprise_id, nom, prenom, telephone_wa, email)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [entrepriseId, client.nom, client.prenom, client.telephone_wa, client.email || null],
      );
      clientId = created.rows[0].id;
    }

    const contrat = await tx.query(
      `INSERT INTO contrats
         (entreprise_id, client_id, numero_police, type_assurance,
          date_souscription, date_expiration, montant_prime, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [entrepriseId, clientId, numero_police, type_assurance, date_souscription, date_expiration, montant_prime || null, userId],
    );

    return getById(contrat.rows[0].id, entrepriseId);
  });
}

export async function update(id, payload, entrepriseId) {
  await getById(id, entrepriseId); // 404 si absent / autre entreprise

  const fields = [];
  const params = [];
  const allowed = ['type_assurance', 'date_souscription', 'date_expiration', 'montant_prime', 'statut'];
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      params.push(payload[key]);
      fields.push(`${key} = $${params.length}`);
    }
  }
  if (!fields.length) return getById(id, entrepriseId);

  params.push(id, entrepriseId);
  await query(
    `UPDATE contrats SET ${fields.join(', ')} WHERE id = $${params.length - 1} AND entreprise_id = $${params.length}`,
    params,
  );
  return getById(id, entrepriseId);
}

/** Désactivation logique : passe le statut à 'suspendu' (pas de suppression). */
export async function deactivate(id, entrepriseId) {
  await getById(id, entrepriseId);
  await query(`UPDATE contrats SET statut = 'suspendu' WHERE id = $1 AND entreprise_id = $2`, [id, entrepriseId]);
  return { ok: true };
}
