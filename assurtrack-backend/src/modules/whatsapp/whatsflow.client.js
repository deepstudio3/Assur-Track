import { env } from '../../config/env.js';

/**
 * Client bas-niveau de l'API WhatsFlow (FastAPI).
 * Toutes les requêtes s'authentifient avec la clé API du client WhatsFlow
 * (Authorization: Bearer <api_key>). L'identifiant de session, lui, est propre
 * à chaque entreprise et géré par la couche au-dessus (connection.service).
 *
 * Si WhatsFlow n'est pas configuré (URL/clé/clientId manquants), `isConfigured()`
 * renvoie false et les couches appelantes dégradent proprement (envois ignorés).
 */

export function isConfigured() {
  const { url, apiKey, clientId } = env.whatsflow;
  return Boolean(url && apiKey && clientId);
}

function baseUrl() {
  return env.whatsflow.url.replace(/\/+$/, '');
}

async function request(method, path, body) {
  const res = await fetch(`${baseUrl()}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.whatsflow.apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* corps non JSON (rare) */
  }

  if (!res.ok) {
    const detail = data?.detail || data?.message || `HTTP ${res.status}`;
    const err = new Error(`WhatsFlow: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Crée une session (connexion par QR code) et la démarre côté WhatsFlow. */
export function createSession(label) {
  return request('POST', '/session/create', {
    client_id: env.whatsflow.clientId,
    session_label: label,
  });
}

/** Récupère le QR frais ({status, qr_code, expires_in}). À sonder ~3s. */
export function getQr(sessionId) {
  return request('GET', `/session/${sessionId}/qr`);
}

/** État de la session ({connected, phone_number, ...}). */
export function getStatus(sessionId) {
  return request('GET', `/session/${sessionId}/status`);
}

/** Relance le cycle de connexion pour obtenir un nouveau QR. */
export function restartSession(sessionId) {
  return request('POST', `/session/${sessionId}/restart`);
}

/** Supprime/déconnecte la session. */
export function deleteSession(sessionId) {
  return request('DELETE', `/session/${sessionId}`);
}

/** Envoie un message texte. `to` au format chiffres internationaux (237…). */
export function sendText(sessionId, to, message) {
  return request('POST', `/session/${sessionId}/send-message`, { to, message });
}
