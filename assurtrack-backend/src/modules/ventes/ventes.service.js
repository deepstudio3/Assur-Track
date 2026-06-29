import { query, withTransaction } from '../../config/database.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { envoyerMessage } from '../whatsapp/whatsapp.service.js';
import { TEMPLATES } from '../whatsapp/templates.js';

function shapeVente(row) {
  return {
    id: row.id,
    montant_total: row.montant_total,
    mode_paiement: row.mode_paiement,
    statut: row.statut,
    client_nom: row.client_nom,
    client_prenom: row.client_prenom,
    note: row.note,
    created_at: row.created_at,
    secretaire: row.sec_prenom ? `${row.sec_prenom} ${row.sec_nom}` : undefined,
    secretaire_id: row.secretaire_id,
    resume: row.resume || '',
    lignes: row.lignes || [],
  };
}

const SELECT_VENTE = `
  SELECT v.*, s.prenom AS sec_prenom, s.nom AS sec_nom,
    (SELECT string_agg(l.produit_nom || ' ×' || l.quantite, ' · ' ORDER BY l.produit_nom)
       FROM ventes_lignes l WHERE l.vente_id = v.id) AS resume,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'produit_id', l.produit_id, 'produit_nom', l.produit_nom,
          'quantite', l.quantite, 'prix_unitaire', l.prix_unitaire, 'sous_total', l.sous_total)
        ORDER BY l.produit_nom)
       FROM ventes_lignes l WHERE l.vente_id = v.id),
      '[]'::json) AS lignes
  FROM ventes v JOIN users s ON s.id = v.secretaire_id
`;

/** Liste paginée/filtrée des ventes. */
export async function list({ entrepriseId, mode, statut }) {
  const where = ['v.entreprise_id = $1'];
  const params = [entrepriseId];
  if (mode && mode !== 'tout') {
    params.push(mode);
    where.push(`v.mode_paiement = $${params.length}`);
  }
  if (statut) {
    params.push(statut);
    where.push(`v.statut = $${params.length}`);
  }
  const { rows } = await query(
    `${SELECT_VENTE} WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC`,
    params,
  );
  return rows.map(shapeVente);
}

export async function getById(id, entrepriseId) {
  const { rows } = await query(`${SELECT_VENTE} WHERE v.id = $1 AND v.entreprise_id = $2`, [id, entrepriseId]);
  if (!rows[0]) throw new NotFoundError('Vente introuvable');
  return shapeVente(rows[0]);
}

/** Enregistre une vente (snapshot des prix) puis notifie la patronne. */
export async function create({ lignes, mode_paiement, client, note }, { user }) {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    throw new BadRequestError('Au moins un produit est requis');
  }
  if (!['comptant', 'credit'].includes(mode_paiement)) {
    throw new BadRequestError('Mode de paiement invalide');
  }
  if (mode_paiement === 'credit' && (!client?.nom?.trim() || !client?.prenom?.trim())) {
    throw new BadRequestError('Nom et prénom du client requis pour une vente à crédit');
  }

  // Snapshot des produits depuis la base (jamais faire confiance au prix client)
  const ids = lignes.map((l) => l.produit_id);
  const prodRes = await query(
    `SELECT id, nom, prix_unitaire FROM produits WHERE entreprise_id = $1 AND id = ANY($2::uuid[])`,
    [user.entreprise_id, ids],
  );
  const prodMap = Object.fromEntries(prodRes.rows.map((p) => [p.id, p]));

  const computed = lignes.map((l) => {
    const p = prodMap[l.produit_id];
    if (!p) throw new BadRequestError('Produit inconnu dans le panier');
    const qte = parseInt(l.quantite, 10);
    if (!(qte > 0)) throw new BadRequestError('Quantité invalide');
    return { produit_id: p.id, produit_nom: p.nom, quantite: qte, prix_unitaire: p.prix_unitaire, sous_total: p.prix_unitaire * qte };
  });
  const total = computed.reduce((s, l) => s + l.sous_total, 0);
  const statut = mode_paiement === 'credit' ? 'en_attente' : 'payee';

  const venteId = await withTransaction(async (tx) => {
    const v = await tx.query(
      `INSERT INTO ventes (entreprise_id, secretaire_id, montant_total, mode_paiement, statut, client_nom, client_prenom, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [user.entreprise_id, user.id, total, mode_paiement, statut, client?.nom || null, client?.prenom || null, note || null],
    );
    const id = v.rows[0].id;
    for (const l of computed) {
      await tx.query(
        `INSERT INTO ventes_lignes (vente_id, produit_id, produit_nom, quantite, prix_unitaire, sous_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, l.produit_id, l.produit_nom, l.quantite, l.prix_unitaire, l.sous_total],
      );
    }
    return id;
  });

  // Notification patronne (non bloquante)
  try {
    const { rows } = await query(
      `SELECT prenom, nom, telephone_wa FROM users
       WHERE entreprise_id = $1 AND role = 'patronne' AND actif = TRUE AND telephone_wa IS NOT NULL LIMIT 1`,
      [user.entreprise_id],
    );
    const patronne = rows[0];
    if (patronne) {
      const me = await query(`SELECT prenom, nom FROM users WHERE id = $1`, [user.id]);
      const resume = computed.map((l) => `${l.produit_nom} ×${l.quantite}`).join(' · ');
      const heure = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      const msg =
        mode_paiement === 'credit'
          ? TEMPLATES.vente_credit(me.rows[0], total, resume, client, heure)
          : TEMPLATES.vente_comptant(me.rows[0], total, resume, heure);
      await envoyerMessage(patronne.telephone_wa, msg, user.entreprise_id);
    }
  } catch (err) {
    console.error('[ventes] notification échouée :', err.message);
  }

  return getById(venteId, user.entreprise_id);
}

/** Ventes à crédit non soldées (le client regroupe par nom). */
export async function dettes({ entrepriseId }) {
  const { rows } = await query(
    `${SELECT_VENTE} WHERE v.entreprise_id = $1 AND v.mode_paiement = 'credit' AND v.statut = 'en_attente'
     ORDER BY v.created_at DESC`,
    [entrepriseId],
  );
  return rows.map(shapeVente);
}

/** Marque une vente à crédit comme payée (secrétaire OU patronne). */
export async function payer(venteId, { montant, note }, user) {
  const vente = await getById(venteId, user.entreprise_id);
  if (vente.mode_paiement !== 'credit') throw new BadRequestError('Cette vente n\'est pas à crédit');
  if (vente.statut === 'payee') throw new BadRequestError('Cette dette est déjà soldée');

  const value = montant != null ? Number(montant) : vente.montant_total;
  if (!(value > 0)) throw new BadRequestError('Montant invalide');

  await withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO paiements_dette (vente_id, montant, paye_par, note) VALUES ($1,$2,$3,$4)`,
      [venteId, value, user.id, note || null],
    );
    // Paiement total (cumul ≥ montant_total) → statut payée
    const sum = await tx.query(
      `SELECT COALESCE(SUM(montant),0) AS s FROM paiements_dette WHERE vente_id = $1`,
      [venteId],
    );
    if (Number(sum.rows[0].s) >= Number(vente.montant_total)) {
      await tx.query(`UPDATE ventes SET statut = 'payee' WHERE id = $1`, [venteId]);
    }
  });

  // Notification patronne (non bloquante)
  try {
    const { rows } = await query(
      `SELECT prenom, nom, telephone_wa FROM users
       WHERE entreprise_id = $1 AND role = 'patronne' AND actif = TRUE AND telephone_wa IS NOT NULL LIMIT 1`,
      [user.entreprise_id],
    );
    if (rows[0]) {
      const me = await query(`SELECT prenom, nom FROM users WHERE id = $1`, [user.id]);
      const heure = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      await envoyerMessage(
        rows[0].telephone_wa,
        TEMPLATES.dette_payee({ prenom: vente.client_prenom, nom: vente.client_nom }, value, me.rows[0], heure),
        user.entreprise_id,
      );
    }
  } catch (err) {
    console.error('[ventes] notification paiement échouée :', err.message);
  }

  return getById(venteId, user.entreprise_id);
}

/** Stats ventes pour le dashboard. */
export async function stats(entrepriseId) {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(montant_total) FILTER (WHERE mode_paiement='comptant' AND created_at::date = CURRENT_DATE),0) AS ca_jour,
       COALESCE(SUM(montant_total) FILTER (WHERE mode_paiement='comptant' AND date_trunc('month',created_at)=date_trunc('month',CURRENT_DATE)),0) AS ca_mois,
       COALESCE(SUM(montant_total) FILTER (WHERE mode_paiement='credit' AND statut='en_attente'),0) AS total_dettes,
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS nb_ventes_jour
     FROM ventes WHERE entreprise_id = $1`,
    [entrepriseId],
  );
  const r = rows[0];
  return {
    ca_jour: Number(r.ca_jour),
    ca_mois: Number(r.ca_mois),
    total_dettes: Number(r.total_dettes),
    nb_ventes_jour: r.nb_ventes_jour,
  };
}
