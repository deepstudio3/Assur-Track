import { query } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { envoyerMessage } from '../whatsapp/whatsapp.service.js';
import { getTemplate, fill, fmtDate } from '../templates/templates.service.js';
import { notify } from '../notifications/notifications.service.js';

/** Détermine le type de relance à partir du nombre de jours restants. */
function typeFromJours(jours) {
  if (jours <= 0) return 'J-0';
  if (jours <= 7) return 'J-7';
  return 'J-30';
}

/** Historique des relances envoyées (par entreprise). */
export async function list({ entrepriseId, contratId }) {
  const params = [entrepriseId];
  let where = 'c.entreprise_id = $1';
  if (contratId) {
    params.push(contratId);
    where += ` AND r.contrat_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT r.*, cl.nom AS client_nom, cl.prenom AS client_prenom,
            c.numero_police, c.type_assurance
     FROM relances r
     JOIN contrats c ON c.id = r.contrat_id
     JOIN clients cl ON cl.id = c.client_id
     WHERE ${where}
     ORDER BY r.envoye_at DESC`,
    params,
  );
  return rows;
}

/** Enregistre une relance (succès/échec) dans l'historique. */
async function logRelance(contratId, type, destinataire, message, statut) {
  await query(
    `INSERT INTO relances (contrat_id, type_relance, destinataire, message, statut)
     VALUES ($1,$2,$3,$4,$5)`,
    [contratId, type, destinataire, message, statut],
  );
}

/** Récupère le contrat + client + contacts entreprise. */
async function getContratComplet(contratId, entrepriseId) {
  const { rows } = await query(
    `SELECT c.*, cl.nom AS client_nom, cl.prenom AS client_prenom, cl.telephone_wa AS client_tel,
            e.telephone_gerant, e.telephone_responsable,
            (c.date_expiration - CURRENT_DATE) AS jours_restants
     FROM contrats c
     JOIN clients cl ON cl.id = c.client_id
     JOIN entreprises e ON e.id = c.entreprise_id
     WHERE c.id = $1 AND c.entreprise_id = $2`,
    [contratId, entrepriseId],
  );
  if (!rows[0]) throw new NotFoundError('Contrat introuvable');
  return rows[0];
}

/**
 * Envoie une relance pour un contrat à un ensemble de destinataires.
 * Renvoie le détail des envois. Utilisé en manuel et par le cron.
 */
export async function envoyerPourContrat(row, { type } = {}) {
  const relanceType = type || typeFromJours(Number(row.jours_restants));

  // Template personnalisable de l'entreprise (sinon défaut), variables remplies.
  const tpl = await getTemplate(row.entreprise_id, relanceType);
  let message = fill(tpl, {
    prenom: row.client_prenom,
    type: row.type_assurance,
    police: row.numero_police,
    date: fmtDate(row.date_expiration),
  });
  // Le n° de châssis (assurance auto) est ajouté automatiquement s'il existe.
  if (row.numero_chassis) {
    message += `\n\n🚗 Véhicule — N° de châssis : *${row.numero_chassis}*`;
  }

  const destinataires = [
    row.client_tel,
    row.telephone_gerant,
    row.telephone_responsable,
  ].filter(Boolean);

  const results = [];
  for (const dest of destinataires) {
    try {
      await envoyerMessage(dest, message, row.entreprise_id);
      await logRelance(row.id, relanceType, dest, message, 'envoye');
      results.push({ destinataire: dest, statut: 'envoye' });
    } catch (err) {
      await logRelance(row.id, relanceType, dest, message, 'echec');
      results.push({ destinataire: dest, statut: 'echec', erreur: err.message });
    }
  }

  // Notification in-app (diffusion entreprise)
  const okCount = results.filter((r) => r.statut === 'envoye').length;
  await notify(
    row.entreprise_id,
    null,
    'relance',
    okCount ? `Relance ${relanceType} envoyée` : `Relance ${relanceType} en échec`,
    `${row.client_prenom} ${row.client_nom} · ${row.numero_police}`,
  );

  return { type: relanceType, envois: results };
}

/** Relance manuelle déclenchée depuis l'interface. */
export async function envoyerManuelle(contratId, entrepriseId) {
  const row = await getContratComplet(contratId, entrepriseId);
  return envoyerPourContrat(row);
}

/**
 * Vérifie les échéances du jour et envoie les relances dues (cron quotidien).
 *  - J-30 : expiration = aujourd'hui + 30
 *  - J-7  : expiration = aujourd'hui + 7
 *  - J-0  : expiration = aujourd'hui
 */
export async function verifierEcheances() {
  const cibles = [
    { offset: 30, type: 'J-30' },
    { offset: 7, type: 'J-7' },
    { offset: 0, type: 'J-0' },
  ];

  let total = 0;
  for (const { offset, type } of cibles) {
    const { rows } = await query(
      `SELECT c.*, cl.nom AS client_nom, cl.prenom AS client_prenom, cl.telephone_wa AS client_tel,
              e.telephone_gerant, e.telephone_responsable,
              (c.date_expiration - CURRENT_DATE) AS jours_restants
       FROM contrats c
       JOIN clients cl ON cl.id = c.client_id
       JOIN entreprises e ON e.id = c.entreprise_id
       WHERE c.statut = 'actif'
         AND c.date_expiration = CURRENT_DATE + ($1 || ' days')::interval`,
      [offset],
    );
    for (const row of rows) {
      await envoyerPourContrat(row, { type });
      total += 1;
    }
  }
  console.log(`[cron] relances traitées pour ${total} contrat(s)`);
  return { contrats_traites: total };
}
