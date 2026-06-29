import { query } from '../../config/database.js';
import { BadRequestError } from '../../utils/errors.js';
import { fmtDate, fmtMontant } from '../whatsapp/templates.js';

// Réexport des formateurs pour les services émetteurs (relances, caisse).
export { fmtDate, fmtMontant };

/** Clés de templates personnalisables par l'entreprise. */
export const TEMPLATE_KEYS = ['J-30', 'J-7', 'J-0', 'operation'];

/** Variables disponibles par template (pour l'UI / la doc). */
export const TEMPLATE_VARS = {
  'J-30': ['prenom', 'type', 'police', 'date'],
  'J-7': ['prenom', 'type', 'police', 'date'],
  'J-0': ['prenom', 'type', 'police', 'date'],
  operation: ['secretaire', 'montant', 'motif', 'heure'],
};

/** Contenus par défaut (utilisés tant qu'aucune personnalisation n'est enregistrée). */
export const DEFAULT_TEMPLATES = {
  'J-30':
    "Bonjour {prenom} 👋\n\nVotre contrat d'assurance *{type}* (N° {police}) expire dans *30 jours*, le {date}.\n\nContactez-nous maintenant pour renouveler votre couverture.\n\n_AssurTrack_",
  'J-7':
    "⚠️ Rappel urgent — Bonjour {prenom}\n\nVotre contrat *{type}* (N° {police}) expire dans *7 jours*.\n\nRenouvelez dès aujourd'hui pour éviter toute interruption de couverture.\n\n_AssurTrack_",
  'J-0':
    "🔴 *EXPIRATION AUJOURD'HUI*\n\nBonjour {prenom}, votre contrat *{type}* (N° {police}) expire ce jour.\n\nContactez immédiatement votre agence.\n\n_AssurTrack_",
  operation:
    '💰 *Nouvelle dette enregistrée*\n\n{secretaire} déclare que vous avez pris *{montant}* dans sa caisse.\nMotif : {motif}\nHeure : {heure}\n\nConnectez-vous à AssurTrack pour suivre et rembourser.\n_AssurTrack_',
};

/** Remplace les {variables} d'un template par leurs valeurs. */
export function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

/** Templates de l'entreprise (défauts fusionnés avec ses personnalisations). */
export async function getTemplates(entrepriseId) {
  const { rows } = await query(
    `SELECT cle, contenu FROM message_templates WHERE entreprise_id = $1`,
    [entrepriseId],
  );
  const overrides = Object.fromEntries(rows.map((r) => [r.cle, r.contenu]));
  return TEMPLATE_KEYS.reduce((acc, k) => {
    acc[k] = overrides[k] ?? DEFAULT_TEMPLATES[k];
    return acc;
  }, {});
}

/** Un template précis pour l'envoi (personnalisé sinon défaut). */
export async function getTemplate(entrepriseId, cle) {
  const { rows } = await query(
    `SELECT contenu FROM message_templates WHERE entreprise_id = $1 AND cle = $2`,
    [entrepriseId, cle],
  );
  return rows[0]?.contenu ?? DEFAULT_TEMPLATES[cle] ?? '';
}

/** Enregistre/écrase les templates fournis (patronne). */
export async function saveTemplates(entrepriseId, map) {
  const entries = Object.entries(map || {}).filter(([k]) => TEMPLATE_KEYS.includes(k));
  if (!entries.length) throw new BadRequestError('Aucun template valide fourni');

  for (const [cle, contenu] of entries) {
    if (typeof contenu !== 'string' || !contenu.trim()) {
      throw new BadRequestError(`Le template « ${cle} » ne peut pas être vide`);
    }
    await query(
      `INSERT INTO message_templates (entreprise_id, cle, contenu, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (entreprise_id, cle)
       DO UPDATE SET contenu = EXCLUDED.contenu, updated_at = NOW()`,
      [entrepriseId, cle, contenu],
    );
  }
  return getTemplates(entrepriseId);
}
