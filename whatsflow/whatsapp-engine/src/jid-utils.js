// ============================================================
// jid-utils.js — Résolution des identifiants WhatsApp (JID / LID)
// ============================================================
//
// Contexte : WhatsApp adresse désormais beaucoup d'utilisateurs via un
// "LID" anonyme (xxxxx@lid). Le "xxxxx" est un identifiant interne opaque,
// ce N'EST PAS le numéro de téléphone — le stripper donnerait un faux numéro.
//
// Stratégie "senderPn" : depuis Baileys 6.7.x, WhatsApp fournit souvent le
// vrai numéro directement dans la clé du message (key.senderPn en 1-to-1,
// key.participantPn en groupe), même quand remoteJid est un @lid.
// On l'utilise en priorité ; à défaut, on conserve le LID comme identifiant
// stable plutôt que d'inventer un numéro erroné.

/**
 * Nettoie un JID pour ne garder que sa partie identifiante.
 * Retire le suffixe serveur et l'éventuel suffixe d'appareil (":12").
 * @param {string} jid
 * @returns {string}
 */
function stripJid(jid) {
    return (jid || '')
        .replace('@s.whatsapp.net', '')
        .replace('@g.us', '')
        .replace('@lid', '')
        .split(':')[0]; // retire la partie appareil (ex: 33612345678:12)
}

/**
 * Résout l'expéditeur d'un message Baileys en numéro réel quand WhatsApp
 * le fournit (key.senderPn / key.participantPn).
 *
 * @param {object} message - Message Baileys (avec .key)
 * @returns {{ from: string, fromClean: string, fromType: string, senderPn: string }}
 *   - from      : remoteJid brut
 *   - fromClean : numéro réel si résolu, sinon LID/participant nettoyé
 *   - fromType  : 'phone' | 'phone_resolved' | 'lid' | 'group' | 'group_phone'
 *   - senderPn  : JID numéro (@s.whatsapp.net) si connu, sinon ''
 */
function resolveSender(message) {
    const key = (message && message.key) || {};
    const from = key.remoteJid || '';

    // ── Groupe : l'expéditeur réel est le participant ──
    if (from.endsWith('@g.us')) {
        const pn = key.participantPn || '';
        if (pn.endsWith('@s.whatsapp.net')) {
            return { from, fromClean: stripJid(pn), fromType: 'group_phone', senderPn: pn };
        }
        // participant peut lui-même être un @lid → on garde l'identifiant tel quel
        const participant = key.participant || from;
        return { from, fromClean: stripJid(participant), fromType: 'group', senderPn: '' };
    }

    // ── LID anonyme : utiliser senderPn si WhatsApp l'a fourni ──
    if (from.endsWith('@lid')) {
        const pn = key.senderPn || '';
        if (pn.endsWith('@s.whatsapp.net')) {
            return { from, fromClean: stripJid(pn), fromType: 'phone_resolved', senderPn: pn };
        }
        // Pas de numéro fourni → on conserve le LID (pas de faux numéro)
        return { from, fromClean: stripJid(from), fromType: 'lid', senderPn: '' };
    }

    // ── Numéro classique @s.whatsapp.net ──
    return { from, fromClean: stripJid(from), fromType: 'phone', senderPn: from };
}

module.exports = { resolveSender, stripJid };
