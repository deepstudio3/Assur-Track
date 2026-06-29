import { query } from '../../config/database.js';
import { BadRequestError } from '../../utils/errors.js';
import { isConfigured, sendText } from './whatsflow.client.js';

/** Normalise un numéro camerounais en chiffres internationaux : 2376XXXXXXXX. */
export function formatNumeroCameroun(tel) {
  const clean = String(tel || '').replace(/\D/g, '');
  if (clean.startsWith('237')) return clean;
  if (clean.length === 9) return `237${clean}`;
  throw new BadRequestError(`Numéro camerounais invalide : ${tel}`);
}

/** Renvoie la session WhatsApp connectée d'une entreprise, ou null. */
async function sessionConnectee(entrepriseId) {
  const sql = entrepriseId
    ? `SELECT wa_session_id FROM entreprises
       WHERE id = $1 AND wa_session_id IS NOT NULL AND wa_status = 'connected'`
    : `SELECT wa_session_id FROM entreprises
       WHERE wa_session_id IS NOT NULL AND wa_status = 'connected' LIMIT 1`;
  const { rows } = await query(sql, entrepriseId ? [entrepriseId] : []);
  return rows[0]?.wa_session_id || null;
}

/**
 * Envoie un message WhatsApp via la session connectée de l'entreprise.
 * Dégrade proprement (renvoie {skipped:true}) si WhatsApp n'est pas configuré
 * ou si l'entreprise n'a pas de session connectée — sans lever d'erreur, pour
 * ne jamais bloquer une opération métier (caisse, vente, relance).
 */
export async function envoyerMessage(telephone, message, entrepriseId) {
  const numero = formatNumeroCameroun(telephone);

  if (!isConfigured()) {
    console.log(`[whatsapp] (désactivé) message destiné à ${numero}`);
    return { skipped: true, reason: 'not_configured', to: numero };
  }

  const sessionId = await sessionConnectee(entrepriseId);
  if (!sessionId) {
    console.log(`[whatsapp] (non connecté) message destiné à ${numero}`);
    return { skipped: true, reason: 'not_connected', to: numero };
  }

  return sendText(sessionId, numero, message);
}
