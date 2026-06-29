import { env } from '../../config/env.js';
import { BadRequestError } from '../../utils/errors.js';

/** Normalise un numéro camerounais en format international +2376XXXXXXXX. */
export function formatNumeroCameroun(tel) {
  const clean = String(tel || '').replace(/\D/g, '');
  if (clean.startsWith('237')) return `+${clean}`;
  if (clean.length === 9) return `+237${clean}`;
  throw new BadRequestError(`Numéro camerounais invalide : ${tel}`);
}

/**
 * Envoie un message WhatsApp via WhatsFlow (Swift AI).
 * Si WHATSFLOW_URL n'est pas configuré, l'envoi est ignoré (mode étape 2/3)
 * et la fonction renvoie { skipped: true } sans lever d'erreur.
 */
export async function envoyerMessage(telephone, message) {
  const numero = formatNumeroCameroun(telephone);

  if (!env.whatsflow.url) {
    console.log(`[whatsapp] (désactivé) message destiné à ${numero}`);
    return { skipped: true, to: numero };
  }

  const response = await fetch(`${env.whatsflow.url}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.whatsflow.token}`,
      'X-Client-UUID': env.whatsflow.client,
    },
    body: JSON.stringify({ to: numero, message, type: 'text' }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json())?.message || '';
    } catch {
      /* corps non JSON */
    }
    throw new Error(`Échec WhatsApp (${response.status}) ${detail}`);
  }
  return response.json();
}
