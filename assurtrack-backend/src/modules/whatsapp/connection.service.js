import { query } from '../../config/database.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import {
  isConfigured,
  createSession,
  getQr,
  getStatus,
  restartSession,
  deleteSession,
} from './whatsflow.client.js';

/**
 * Pilote la connexion WhatsApp d'une entreprise via WhatsFlow.
 * Flux QR : connect() crée la session → qr() est sondé jusqu'au scan →
 * status() confirme la connexion. L'identifiant de session est mémorisé sur
 * l'entreprise pour l'envoi des messages.
 */

function ensureConfigured() {
  if (!isConfigured()) {
    throw new BadRequestError(
      "WhatsApp n'est pas configuré sur le serveur (WHATSFLOW_URL / API_KEY / CLIENT_ID).",
    );
  }
}

async function getEntreprise(entrepriseId) {
  const { rows } = await query(
    `SELECT id, wa_session_id, wa_phone, wa_status FROM entreprises WHERE id = $1`,
    [entrepriseId],
  );
  if (!rows[0]) throw new NotFoundError('Entreprise introuvable');
  return rows[0];
}

async function setSession(entrepriseId, { sessionId, phone, status }) {
  const { rows } = await query(
    `UPDATE entreprises
       SET wa_session_id = $2, wa_phone = $3, wa_status = $4
     WHERE id = $1
     RETURNING wa_session_id, wa_phone, wa_status`,
    [entrepriseId, sessionId, phone, status],
  );
  return rows[0];
}

/** Crée (ou réutilise) une session WhatsApp pour l'entreprise. */
export async function connect(entrepriseId) {
  ensureConfigured();
  const ent = await getEntreprise(entrepriseId);

  // Déjà connectée → rien à recréer
  if (ent.wa_session_id && ent.wa_status === 'connected') {
    return { session_id: ent.wa_session_id, status: 'connected', phone: ent.wa_phone };
  }

  const label = `assurtrack-${String(entrepriseId).slice(0, 8)}`;
  const session = await createSession(label);
  await setSession(entrepriseId, {
    sessionId: session.id,
    phone: null,
    status: 'connecting',
  });
  return { session_id: session.id, status: 'connecting', phone: null };
}

/** Récupère le QR frais à afficher (sonder toutes les ~3s). */
export async function qr(entrepriseId) {
  ensureConfigured();
  const ent = await getEntreprise(entrepriseId);
  if (!ent.wa_session_id) throw new BadRequestError('Aucune session : appelez /connect d’abord');

  const data = await getQr(ent.wa_session_id);

  // WhatsFlow signale la connexion pendant l'attente du QR
  if (data?.status === 'connected') {
    await setSession(entrepriseId, {
      sessionId: ent.wa_session_id,
      phone: ent.wa_phone,
      status: 'connected',
    });
    return { status: 'connected', qr_code: null };
  }

  return {
    status: data?.status || 'starting',
    qr_code: data?.qr_code || null,
    expires_in: data?.expires_in,
  };
}

/** État courant + synchronisation en base (téléphone, statut connecté). */
export async function status(entrepriseId) {
  const ent = await getEntreprise(entrepriseId);
  if (!ent.wa_session_id) {
    return { connected: false, status: 'disconnected', phone: null, configured: isConfigured() };
  }

  let info;
  try {
    info = await getStatus(ent.wa_session_id);
  } catch {
    // WhatsFlow injoignable : on renvoie le dernier état connu
    return {
      connected: ent.wa_status === 'connected',
      status: ent.wa_status,
      phone: ent.wa_phone,
      configured: isConfigured(),
    };
  }

  const connected = Boolean(info?.connected);
  const phone = info?.phone_number || ent.wa_phone || null;
  const newStatus = connected ? 'connected' : 'connecting';
  if (connected !== (ent.wa_status === 'connected') || phone !== ent.wa_phone) {
    await setSession(entrepriseId, { sessionId: ent.wa_session_id, phone, status: newStatus });
  }
  return { connected, status: newStatus, phone, configured: isConfigured() };
}

/** Relance le cycle de connexion (nouveau QR). */
export async function restart(entrepriseId) {
  ensureConfigured();
  const ent = await getEntreprise(entrepriseId);
  if (!ent.wa_session_id) return connect(entrepriseId);
  await restartSession(ent.wa_session_id);
  await setSession(entrepriseId, { sessionId: ent.wa_session_id, phone: null, status: 'connecting' });
  return { session_id: ent.wa_session_id, status: 'connecting' };
}

/** Déconnecte et efface la session. */
export async function disconnect(entrepriseId) {
  const ent = await getEntreprise(entrepriseId);
  if (ent.wa_session_id && isConfigured()) {
    try {
      await deleteSession(ent.wa_session_id);
    } catch {
      /* session déjà absente côté WhatsFlow */
    }
  }
  await setSession(entrepriseId, { sessionId: null, phone: null, status: 'disconnected' });
  return { status: 'disconnected' };
}
