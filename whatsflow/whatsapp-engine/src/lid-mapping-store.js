// ============================================================
// lid-mapping-store.js — Table de correspondance LID → numéro (Postgres)
// ============================================================
//
// Complément à la stratégie senderPn (cf. jid-utils.js) : senderPn n'est
// fourni par WhatsApp que de façon INTERMITTENTE. Dès qu'on a vu une fois
// le couple (lid, numéro), on le mémorise ici pour résoudre TOUS les
// messages suivants de ce LID, même quand senderPn est absent.

const { resolveSender, stripJid } = require('./jid-utils');

/**
 * Crée un store de mapping LID↔numéro lié à un pool pg existant.
 * @param {import('pg').Pool} pool
 */
function createLidStore(pool) {

    /** Crée la table si elle n'existe pas. À appeler une fois au démarrage. */
    async function ensureTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lid_mappings (
                lid         TEXT PRIMARY KEY,
                phone       TEXT NOT NULL,
                session_id  TEXT,
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
    }

    /** Mémorise (ou met à jour) un couple lid → numéro. Échec silencieux. */
    async function remember(lid, phone, sessionId) {
        if (!lid || !phone) return;
        try {
            await pool.query(
                `INSERT INTO lid_mappings (lid, phone, session_id, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (lid)
                 DO UPDATE SET phone = $2, session_id = $3, updated_at = NOW()`,
                [lid, phone, sessionId || null]
            );
        } catch (e) {
            console.log(`[LidStore] Erreur écriture ${lid}→${phone}: ${e.message}`);
        }
    }

    /** Cherche le numéro associé à un lid. Renvoie null si inconnu. */
    async function lookup(lid) {
        if (!lid) return null;
        try {
            const r = await pool.query(
                `SELECT phone FROM lid_mappings WHERE lid = $1`,
                [lid]
            );
            return r.rows.length ? r.rows[0].phone : null;
        } catch (e) {
            console.log(`[LidStore] Erreur lecture ${lid}: ${e.message}`);
            return null;
        }
    }

    /**
     * Résolution complète : senderPn d'abord, puis cache Postgres.
     * - Apprend le couple quand senderPn (ou participantPn) le révèle.
     * - Résout depuis le cache quand senderPn est absent.
     *
     * @param {object} message - Message Baileys
     * @param {string} [sessionId]
     * @returns {Promise<{from,fromClean,fromType,senderPn}>}
     */
    async function resolve(message, sessionId) {
        const r = resolveSender(message);
        const key = (message && message.key) || {};
        const remoteJid = key.remoteJid || '';

        // ── Apprentissage : on vient d'obtenir un numéro pour un LID ──
        if (r.fromType === 'phone_resolved' && remoteJid.endsWith('@lid')) {
            await remember(stripJid(remoteJid), r.fromClean, sessionId);
        }
        // Bonus groupe : participant LID dont on connaît le numéro
        if (key.participantLid && key.participantPn) {
            await remember(stripJid(key.participantLid), stripJid(key.participantPn), sessionId);
        }

        // ── Résolution depuis le cache si senderPn absent ──
        if (r.fromType === 'lid') {
            const phone = await lookup(r.fromClean);
            if (phone) {
                return {
                    from: r.from,
                    fromClean: phone,
                    fromType: 'phone_cached',
                    senderPn: `${phone}@s.whatsapp.net`,
                };
            }
        }

        return r;
    }

    return { ensureTable, remember, lookup, resolve };
}

module.exports = { createLidStore };
