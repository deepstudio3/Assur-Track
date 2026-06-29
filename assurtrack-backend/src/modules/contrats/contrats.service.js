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
    numero_chassis: row.numero_chassis,
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
    numero_chassis,
  } = payload;

  if (!numero_police || !type_assurance || !date_souscription || !date_expiration) {
    throw new BadRequestError('Champs contrat obligatoires manquants');
  }
  if (!client.nom || !client.prenom || !client.telephone_wa) {
    throw new BadRequestError('Informations client obligatoires manquantes');
  }

  // On renvoie l'id depuis la transaction, puis on relit APRÈS le COMMIT :
  // getById passe par une autre connexion du pool et ne verrait pas une
  // ligne encore non committée.
  const newId = await withTransaction(async (tx) => {
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
          date_souscription, date_expiration, montant_prime, numero_chassis, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [entrepriseId, clientId, numero_police, type_assurance, date_souscription, date_expiration, montant_prime || null, numero_chassis || null, userId],
    );

    return contrat.rows[0].id;
  });

  return getById(newId, entrepriseId);
}

export async function update(id, payload, entrepriseId) {
  await getById(id, entrepriseId); // 404 si absent / autre entreprise

  const fields = [];
  const params = [];
  const allowed = ['type_assurance', 'date_souscription', 'date_expiration', 'montant_prime', 'numero_chassis', 'statut'];
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

/**
 * Statistiques financières de l'assurance pour une entreprise.
 * Le chiffre d'affaires = somme des montants payés par les clients
 * (montant_prime), agrégée par mois de souscription. Sert au point de vue
 * financier de la patronne : combien l'assurance a généré ce mois, et la
 * comparaison aux deux mois précédents.
 */
export async function statsFinance(entrepriseId) {
  const agg = await query(
    `SELECT
       COALESCE(SUM(montant_prime) FILTER (
         WHERE date_souscription >= date_trunc('month', CURRENT_DATE)),0) AS ca_mois,
       COALESCE(SUM(montant_prime) FILTER (
         WHERE date_souscription >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
           AND date_souscription <  date_trunc('month', CURRENT_DATE)),0) AS ca_mois_prec,
       COALESCE(SUM(montant_prime) FILTER (
         WHERE date_souscription >= date_trunc('month', CURRENT_DATE) - INTERVAL '2 month'
           AND date_souscription <  date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),0) AS ca_mois_prec2,
       COUNT(*) FILTER (WHERE date_souscription >= date_trunc('month', CURRENT_DATE))::int AS nb_mois,
       COUNT(*) FILTER (
         WHERE date_souscription >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
           AND date_souscription <  date_trunc('month', CURRENT_DATE))::int AS nb_mois_prec,
       COALESCE(SUM(montant_prime),0) AS ca_total,
       COUNT(*)::int AS nb_total
     FROM contrats
     WHERE entreprise_id = $1 AND statut <> 'suspendu'`,
    [entrepriseId],
  );

  const serie = await query(
    `SELECT to_char(m.mois, 'YYYY-MM') AS mois,
            COALESCE(SUM(c.montant_prime),0) AS ca,
            COUNT(c.id)::int AS nb
     FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 month',
                          date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS m(mois)
     LEFT JOIN contrats c
       ON date_trunc('month', c.date_souscription) = m.mois
      AND c.entreprise_id = $1 AND c.statut <> 'suspendu'
     GROUP BY m.mois ORDER BY m.mois`,
    [entrepriseId],
  );

  const r = agg.rows[0];
  const caMois = Number(r.ca_mois);
  const caPrec = Number(r.ca_mois_prec);
  const caPrec2 = Number(r.ca_mois_prec2);
  const variation =
    caPrec > 0 ? Math.round(((caMois - caPrec) / caPrec) * 100) : caMois > 0 ? 100 : 0;

  return {
    ca_mois: caMois,
    ca_mois_prec: caPrec,
    ca_mois_prec2: caPrec2,
    nb_mois: r.nb_mois,
    nb_mois_prec: r.nb_mois_prec,
    ca_total: Number(r.ca_total),
    nb_total: r.nb_total,
    variation_mois: variation,
    serie: serie.rows.map((s) => ({ mois: s.mois, ca: Number(s.ca), nb: s.nb })),
  };
}

/** Désactivation logique : passe le statut à 'suspendu' (pas de suppression). */
export async function deactivate(id, entrepriseId) {
  await getById(id, entrepriseId);
  await query(`UPDATE contrats SET statut = 'suspendu' WHERE id = $1 AND entreprise_id = $2`, [id, entrepriseId]);
  return { ok: true };
}
