// ============================================================
// whatsapp-engine.js — VERSION CORRIGÉE ET PRODUCTION-READY
// ============================================================

const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    DisconnectReason,
    fetchLatestWaWebVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { Pool } = require('pg');
const { usePostgresAuthState } = require('./postgres-auth-state');
const { createLidStore } = require('./lid-mapping-store');
const { stripJid } = require('./jid-utils');
const qrcode = require('qrcode-terminal');

// ----------------------------------------------------------------
// Pool PostgreSQL partagé
// ----------------------------------------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
        || 'postgresql://whatsflow:whatsflow_secure_password@localhost:5433/whatsflow',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// ----------------------------------------------------------------
// Store de mapping LID → numéro (partagé, table créée au démarrage)
// ----------------------------------------------------------------
const lidStore = createLidStore(pool);
lidStore.ensureTable()
    .then(() => console.log('[Engine] Table lid_mappings prête'))
    .catch((e) => console.log(`[Engine] Erreur init lid_mappings: ${e.message}`));

// ----------------------------------------------------------------
// Sessions actives en mémoire
// ----------------------------------------------------------------
const activeSessions = new Map();

// ----------------------------------------------------------------
// FONCTION PRINCIPALE
// ----------------------------------------------------------------
async function createSession(sessionId, options = {}) {
    const { onMessage, onStatusChange, onQR, onPairingCode } = options;

    // Numéro de téléphone pour la connexion par code d'appairage (au lieu du QR).
    // Format attendu : indicatif pays + numéro, chiffres uniquement (ex: "237690000000").
    const phoneNumber = options.phoneNumber
        ? String(options.phoneNumber).replace(/[^0-9]/g, '')
        : null;

    console.log(`[Engine] Démarrage session: ${sessionId}`);

    // Version WhatsApp Web réelle
    const { version } = await fetchLatestWaWebVersion();
    console.log(`[Engine] Version WhatsApp: ${version.join('.')}`);

    // Auth-state depuis PostgreSQL
    const { state, saveCreds } = await usePostgresAuthState(pool, sessionId);

    // Cache mémoire pour les signal keys
    const cachedKeys = makeCacheableSignalKeyStore(state.keys, {
        level: () => {},
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
        child: () => ({
            level: () => {},
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: console.warn,
            error: console.error,
        })
    });

    // Créer le socket
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: cachedKeys,
        },
        connectTimeoutMs:      60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs:   25000,
        retryRequestDelayMs:   250,
        markOnlineOnConnect:   true,
        syncFullHistory:       false,
        browser: ['Ubuntu', 'Chrome', '120.0.6099.109'],
        logger: require('pino')({ level: 'silent' }),
        printQRInTerminal: false,
        getMessage: async () => undefined,
    });

    // Sauvegarder credentials
    sock.ev.on('creds.update', saveCreds);

    // Empêche de redemander un code d'appairage à chaque tick de l'événement `qr`
    let pairingRequested = false;

    // Gérer connexion
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR Code disponible
        if (qr) {
            // ── Connexion par code d'appairage (numéro de téléphone) ──
            // Quand un numéro est fourni et que la session n'est pas encore
            // enregistrée, on demande un code à 8 caractères au lieu d'afficher
            // le QR. Le client saisit ce code dans WhatsApp →
            // Appareils connectés → Lier avec un numéro de téléphone.
            if (phoneNumber && !pairingRequested && !state.creds.registered) {
                pairingRequested = true;
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`[Engine] 🔑 Code d'appairage pour ${sessionId}: ${code}`);
                    if (onPairingCode) onPairingCode(code, phoneNumber);
                    if (onStatusChange) onStatusChange({
                        sessionId, type: 'pairing_code', data: code, phoneNumber
                    });
                } catch (e) {
                    console.error(`[Engine] ❌ Erreur requestPairingCode ${sessionId}: ${e.message}`);
                    // Repli sur le QR si la demande de code échoue
                    pairingRequested = false;
                    qrcode.generate(qr, { small: true });
                    if (onQR) onQR(qr);
                }
                return;
            }

            console.log(`[Engine] QR Code disponible: ${sessionId}`);
            qrcode.generate(qr, { small: true });
            if (onQR) onQR(qr);
            if (onStatusChange) onStatusChange({
                sessionId, type: 'qr', data: qr
            });
        }

        // Connecté avec succès
        if (connection === 'open') {
            console.log(`[Engine] ✅ Connecté: ${sessionId} (${sock.user?.id})`);
            activeSessions.set(sessionId, { sock, isConnected: true });
            if (onStatusChange) onStatusChange({ 
                sessionId, type: 'connected', user: sock.user 
            });
        }

        // Connexion fermée
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message;

            console.log(`[Engine] ⚠️ Déconnecté: ${sessionId} code=${code}`);
            activeSessions.set(sessionId, { sock: null, isConnected: false });

            // 515 = restart normal après QR scan — reconnecter immédiatement
            if (code === 515) {
                console.log(`[Engine] 🔄 Restart requis (515) — reconnexion...`);
                setTimeout(() => createSession(sessionId, options), 1000);
                return;
            }

            // 401 = déconnecté par le téléphone — supprimer session
            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log(`[Engine] ❌ Logged out: ${sessionId}`);
                await pool.query(
                    'DELETE FROM whatsapp_auth_state WHERE session_id = $1',
                    [sessionId]
                );
                activeSessions.delete(sessionId);
                if (onStatusChange) onStatusChange({ 
                    sessionId, type: 'logged_out' 
                });
                return;
            }

            // Autres erreurs — reconnexion avec backoff
            if (onStatusChange) onStatusChange({ 
                sessionId, type: 'disconnected', code, reason 
            });
            await reconnectWithBackoff(sessionId, options);
        }
    });

    // Apprendre les correspondances LID ↔ numéro depuis le carnet d'adresses.
    // WhatsApp pousse des contacts portant à la fois .lid et .jid (ou .id dans
    // l'un des deux formats) → on alimente la table lid_mappings.
    const learnContacts = async (contacts) => {
        for (const c of contacts || []) {
            const lid = c.lid || (String(c.id || '').endsWith('@lid') ? c.id : null);
            const jid = c.jid || (String(c.id || '').endsWith('@s.whatsapp.net') ? c.id : null);
            if (lid && jid) {
                await lidStore.remember(stripJid(lid), stripJid(jid), sessionId);
            }
        }
    };
    sock.ev.on('contacts.upsert', learnContacts);
    sock.ev.on('contacts.update', learnContacts);

    // Recevoir messages entrants
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const message of messages) {
            if (message.key.fromMe) continue;
            console.log(`[Engine] 📨 Message reçu de: ${message.key.remoteJid}`);
            // Le handler est async : on l'attend ET on l'isole dans un try/catch.
            // Sinon un rejet (ex: lidStore.resolve qui échoue) devient une
            // unhandled rejection capable de tuer le process.
            if (onMessage) {
                try {
                    await onMessage(message);
                } catch (e) {
                    console.error(`[Engine] ❌ Erreur handler onMessage (${sessionId}): ${e.message}`);
                }
            }
        }
    });

    return sock;
}

// ----------------------------------------------------------------
// Reconnexion avec backoff exponentiel
// ----------------------------------------------------------------
async function reconnectWithBackoff(sessionId, options, attempt = 0) {
    const delay = Math.min(2000 * Math.pow(2, attempt), 60000);
    console.log(`[Engine] 🔄 Reconnexion dans ${delay/1000}s (tentative ${attempt + 1})`);
    
    await new Promise(r => setTimeout(r, delay));
    
    try {
        await createSession(sessionId, options);
    } catch (error) {
        console.error(`[Engine] Échec tentative ${attempt + 1}:`, error.message);
        if (attempt < 10) {
            await reconnectWithBackoff(sessionId, options, attempt + 1);
        } else {
            console.error(`[Engine] ❌ Abandon après 10 tentatives: ${sessionId}`);
        }
    }
}

// ----------------------------------------------------------------
// État de la connexion : le flag isConnected + un socket réellement
// authentifié (sock.user présent). Combiner les deux évite d'envoyer
// sur un socket en cours de (re)connexion.
// ----------------------------------------------------------------
function isSocketReady(session) {
    return !!(session && session.isConnected && session.sock && session.sock.user);
}

// ----------------------------------------------------------------
// Envoi de message avec retry
// ----------------------------------------------------------------
async function sendMessage(sessionId, jid, content) {
    if (!isSocketReady(activeSessions.get(sessionId))) {
        throw new Error(`Session non connectée: ${sessionId}`);
    }

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        // Revérifier AVANT chaque tentative : la connexion peut tomber
        // entre deux essais (515/close), inutile d'envoyer dans le vide.
        const session = activeSessions.get(sessionId);
        if (!isSocketReady(session)) {
            console.warn(`[Engine] ⚠️ Socket non prêt avant tentative ${attempt}: ${sessionId}`);
            throw new Error(`Session non connectée: ${sessionId}`);
        }
        try {
            console.log(`[Engine] 📤 Envoi (tentative ${attempt}): ${jid}`);
            const result = await session.sock.sendMessage(jid, content);
            console.log(`[Engine] ✅ Envoyé: ${result.key.id}`);
            return result;
        } catch (error) {
            lastError = error;
            // 428 = Connection Closed : le socket est mort, réessayer ne sert
            // à rien — on abandonne tout de suite avec un message clair.
            const statusCode = error?.output?.statusCode;
            if (statusCode === 428) {
                console.warn(`[Engine] ⚠️ Envoi abandonné : connexion fermée (428) ${sessionId}`);
                throw new Error(`Connexion fermée (428): ${sessionId}`);
            }
            console.warn(`[Engine] ⚠️ Tentative ${attempt} échouée:`, error.message);
            if (attempt < 3) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw new Error(`Envoi échoué après 3 tentatives: ${lastError.message}`);
}

// ----------------------------------------------------------------
// Utilitaires
// ----------------------------------------------------------------
function getSessionStatus(sessionId) {
    const session = activeSessions.get(sessionId);
    return {
        sessionId,
        isConnected: session?.isConnected || false,
        userId: session?.sock?.user?.id || null,
    };
}

async function deleteSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (session?.sock) {
        try { await session.sock.logout(); } catch(e) {}
    }
    await pool.query(
        'DELETE FROM whatsapp_auth_state WHERE session_id = $1',
        [sessionId]
    );
    activeSessions.delete(sessionId);
    console.log(`[Engine] 🗑️ Session supprimée: ${sessionId}`);
}

module.exports = {
    createSession,
    sendMessage,
    getSessionStatus,
    deleteSession,
    activeSessions,
    pool,
    lidStore
};