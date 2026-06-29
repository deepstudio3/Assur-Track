import { query } from '../../config/database.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors.js';
import { envoyerMessage } from '../whatsapp/whatsapp.service.js';
import { TEMPLATES } from '../whatsapp/templates.js';

/* ---------- Dettes (operations_caisse) ---------- */
function shapeDette(row) {
  return {
    id: row.id,
    montant: row.montant,
    motif: row.motif,
    created_at: row.created_at,
    secretaire: row.sec_prenom ? `${row.sec_prenom} ${row.sec_nom}` : undefined,
    secretaire_id: row.secretaire_id,
  };
}

function shapeRemb(row) {
  return {
    id: row.id,
    secretaire_id: row.secretaire_id,
    secretaire: row.sec_prenom ? `${row.sec_prenom} ${row.sec_nom}` : undefined,
    montant: row.montant,
    par: row.par_prenom ? `${row.par_prenom} ${row.par_nom[0]}.` : null,
    created_at: row.created_at,
  };
}

/**
 * Liste les dettes ET les remboursements (le client calcule l'allocation FIFO).
 *  - patronne   : tout l'entreprise
 *  - secrétaire : uniquement les siens
 */
export async function list({ user }) {
  const scopeSec = user.role === 'secretaire';
  const params = [user.entreprise_id];
  let detteWhere = 'o.entreprise_id = $1';
  let rembWhere = 'r.entreprise_id = $1';
  if (scopeSec) {
    params.push(user.id);
    detteWhere += ' AND o.secretaire_id = $2';
    rembWhere += ' AND r.secretaire_id = $2';
  }

  const dettes = await query(
    `SELECT o.*, s.prenom AS sec_prenom, s.nom AS sec_nom
     FROM operations_caisse o JOIN users s ON s.id = o.secretaire_id
     WHERE ${detteWhere} ORDER BY o.created_at DESC`,
    params,
  );
  const rembs = await query(
    `SELECT r.*, s.prenom AS sec_prenom, s.nom AS sec_nom, p.prenom AS par_prenom, p.nom AS par_nom
     FROM remboursements r
     JOIN users s ON s.id = r.secretaire_id
     LEFT JOIN users p ON p.id = r.par
     WHERE ${rembWhere} ORDER BY r.created_at DESC`,
    params,
  );

  return {
    dettes: dettes.rows.map(shapeDette),
    remboursements: rembs.rows.map(shapeRemb),
  };
}

/** Enregistre une dette (secrétaire) puis notifie la patronne sur WhatsApp. */
export async function createDette({ montant, motif }, { user }) {
  const value = Number(montant);
  if (!value || value <= 0) throw new BadRequestError('Montant invalide');

  const inserted = await query(
    `INSERT INTO operations_caisse (entreprise_id, secretaire_id, montant, motif)
     VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
    [user.entreprise_id, user.id, value, motif || null],
  );

  try {
    const { rows } = await query(
      `SELECT prenom, nom, telephone_wa FROM users
       WHERE entreprise_id = $1 AND role = 'patronne' AND actif = TRUE AND telephone_wa IS NOT NULL LIMIT 1`,
      [user.entreprise_id],
    );
    const patronne = rows[0];
    if (patronne) {
      const me = await query(`SELECT prenom, nom FROM users WHERE id = $1`, [user.id]);
      const heure = new Date(inserted.rows[0].created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      await envoyerMessage(patronne.telephone_wa, TEMPLATES.nouvelle_operation(me.rows[0], value, motif, heure));
    }
  } catch (err) {
    console.error('[caisse] notification dette échouée :', err.message);
  }

  return { id: inserted.rows[0].id, montant: value, motif: motif || null, created_at: inserted.rows[0].created_at, secretaire_id: user.id };
}

/** Reste dû à une secrétaire = somme dettes − somme remboursements. */
async function resteDu(entrepriseId, secretaireId) {
  const { rows } = await query(
    `SELECT
       COALESCE((SELECT SUM(montant) FROM operations_caisse WHERE entreprise_id=$1 AND secretaire_id=$2),0) -
       COALESCE((SELECT SUM(montant) FROM remboursements   WHERE entreprise_id=$1 AND secretaire_id=$2),0) AS reste`,
    [entrepriseId, secretaireId],
  );
  return Number(rows[0].reste) || 0;
}

/**
 * Rembourse une tranche à une secrétaire (patronne uniquement).
 * Valide montant ≤ reste dû ; notifie secrétaire ET patronne.
 */
export async function rembourser({ secretaireId, montant }, user) {
  if (user.role !== 'patronne') {
    throw new ForbiddenError('Seule la patronne peut rembourser');
  }
  const value = Number(montant);
  if (!value || value <= 0) throw new BadRequestError('Montant invalide');
  if (!secretaireId) throw new BadRequestError('Secrétaire requise');

  // La secrétaire doit appartenir à l'entreprise
  const sec = await query(
    `SELECT id, prenom, nom, telephone_wa FROM users WHERE id = $1 AND entreprise_id = $2 AND role = 'secretaire'`,
    [secretaireId, user.entreprise_id],
  );
  if (!sec.rows[0]) throw new NotFoundError('Secrétaire introuvable');

  const reste = await resteDu(user.entreprise_id, secretaireId);
  if (reste <= 0) throw new BadRequestError('Aucune dette en cours pour cette secrétaire');
  if (value > reste) throw new BadRequestError('Le montant dépasse le reste dû');

  const inserted = await query(
    `INSERT INTO remboursements (entreprise_id, secretaire_id, montant, par)
     VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
    [user.entreprise_id, secretaireId, value, user.id],
  );

  const nouveauReste = reste - value;
  // Notifications (non bloquantes)
  try {
    const secU = sec.rows[0];
    if (secU.telephone_wa) {
      await envoyerMessage(secU.telephone_wa, TEMPLATES.remboursement_secretaire(value, nouveauReste));
    }
    const patronne = await query(`SELECT telephone_wa FROM users WHERE id = $1`, [user.id]);
    if (patronne.rows[0]?.telephone_wa) {
      await envoyerMessage(patronne.rows[0].telephone_wa, TEMPLATES.remboursement_patronne(secU, value, nouveauReste));
    }
  } catch (err) {
    console.error('[caisse] notification remboursement échouée :', err.message);
  }

  return {
    id: inserted.rows[0].id,
    secretaire_id: secretaireId,
    montant: value,
    reste: nouveauReste,
    created_at: inserted.rows[0].created_at,
  };
}

/** Stats caisse (dérivées). secretaireId optionnel pour la vue d'une secrétaire. */
export async function stats(entrepriseId, { secretaireId } = {}) {
  const params = [entrepriseId];
  let detteScope = 'entreprise_id = $1';
  let rembScope = 'entreprise_id = $1';
  if (secretaireId) {
    params.push(secretaireId);
    detteScope += ' AND secretaire_id = $2';
    rembScope += ' AND secretaire_id = $2';
  }
  const { rows } = await query(
    `SELECT
        COALESCE((SELECT SUM(montant) FROM operations_caisse WHERE ${detteScope}),0) AS total_emprunte,
        COALESCE((SELECT SUM(montant) FROM remboursements   WHERE ${rembScope}),0)  AS total_rembourse,
        COALESCE((SELECT COUNT(*) FROM operations_caisse WHERE ${detteScope}),0)::int AS nb_dettes`,
    params,
  );
  const r = rows[0];
  return {
    total_emprunte: Number(r.total_emprunte),
    total_rembourse: Number(r.total_rembourse),
    reste_du: Number(r.total_emprunte) - Number(r.total_rembourse),
    nb_dettes: r.nb_dettes,
  };
}

/** Historique des remboursements (tranches). */
export async function listRemboursements({ user }) {
  const scopeSec = user.role === 'secretaire';
  const params = [user.entreprise_id];
  let where = 'r.entreprise_id = $1';
  if (scopeSec) {
    params.push(user.id);
    where += ' AND r.secretaire_id = $2';
  }
  const { rows } = await query(
    `SELECT r.*, s.prenom AS sec_prenom, s.nom AS sec_nom, p.prenom AS par_prenom, p.nom AS par_nom
     FROM remboursements r
     JOIN users s ON s.id = r.secretaire_id
     LEFT JOIN users p ON p.id = r.par
     WHERE ${where} ORDER BY r.created_at DESC`,
    params,
  );
  return rows.map(shapeRemb);
}
