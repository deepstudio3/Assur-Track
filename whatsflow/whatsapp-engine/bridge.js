// ============================================================
// bridge.js — Pont HTTP entre FastAPI et le moteur Baileys
// VERSION 2.0 — Sessions isolées + notifications automatiques
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const {
    createSession,
    sendMessage,
    getSessionStatus,
    deleteSession,
    activeSessions,
    lidStore
} = require('./src/whatsapp-engine');

const MEDIA_TEMP_DIR = process.env.MEDIA_TEMP_DIR || '/tmp/whatsflow-media';
fs.mkdirSync(MEDIA_TEMP_DIR, { recursive: true });

const PORT = process.env.PORT || process.env.BRIDGE_PORT || 3010;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// ── Filet de sécurité : ne jamais crasher le pont ─────────────────
// Tout rejet/exception non géré est logué mais ne tue pas le process,
// pour que le bridge reste vivant même si Baileys est "surpris".
process.on('unhandledRejection', (reason) => {
    console.error('[Bridge] ⚠️ Unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Bridge] ⚠️ Uncaught exception:', err?.message || err);
});

const pendingQRCodes = new Map();
const pendingPairingCodes = new Map();
const sessionStatuses = new Map();

async function notifyFastAPI(sessionId, eventType, data = {}) {
    try {
        const payload = JSON.stringify({
            session_id: sessionId,
            event: eventType,
            data,
            timestamp: new Date().toISOString()
        });

        const url = new URL(`/api/internal/session/${sessionId}/event`, FASTAPI_URL);

        const options = {
            hostname: url.hostname,
            port: url.port || 8000,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-Internal-Token': 'whatsflow-internal-2026'
            }
        };

        await new Promise((resolve) => {
            const req = http.request(options, (res) => {
                console.log(`[Bridge] Notif FastAPI ${eventType} pour ${sessionId}: ${res.statusCode}`);
                resolve();
            });
            req.on('error', (e) => {
                console.warn(`[Bridge] Notif FastAPI echouee: ${e.message}`);
                resolve();
            });
            req.setTimeout(5000, () => { req.destroy(); resolve(); });
            req.write(payload);
            req.end();
        });
    } catch (e) {
        console.warn(`[Bridge] Erreur notification: ${e.message}`);
    }
}

async function startSessionWithCallbacks(sessionId, phoneNumber = null) {
    console.log(`[Bridge] Demarrage session: ${sessionId}${phoneNumber ? ` (appairage ${phoneNumber})` : ''}`);
    sessionStatuses.set(sessionId, 'starting');

    await createSession(sessionId, {
        phoneNumber,

        onQR: (qr) => {
            console.log(`[Bridge] QR disponible: ${sessionId}`);
            pendingQRCodes.set(sessionId, { qr, timestamp: Date.now() });
            sessionStatuses.set(sessionId, 'qr_ready');
            notifyFastAPI(sessionId, 'qr_ready', { qr });
        },

        onPairingCode: (code, phone) => {
            console.log(`[Bridge] Code d'appairage disponible: ${sessionId} → ${code}`);
            pendingPairingCodes.set(sessionId, { code, phone, timestamp: Date.now() });
            sessionStatuses.set(sessionId, 'pairing_ready');
            notifyFastAPI(sessionId, 'pairing_code_ready', { code, phone });
        },

        onStatusChange: async (status) => {
            console.log(`[Bridge] Status ${sessionId}:`, status.type);
            sessionStatuses.set(sessionId, status.type);

            if (status.type === 'connected') {
                pendingQRCodes.delete(sessionId);
                pendingPairingCodes.delete(sessionId);
                await notifyFastAPI(sessionId, 'connected', {
                    user_id: status.user?.id,
                    phone: status.user?.id?.split(':')[0]
                });
            }

            if (status.type === 'disconnected') {
                await notifyFastAPI(sessionId, 'disconnected', {
                    code: status.code,
                    reason: status.reason
                });
            }

            if (status.type === 'logged_out') {
                pendingQRCodes.delete(sessionId);
                pendingPairingCodes.delete(sessionId);
                sessionStatuses.delete(sessionId);
                await notifyFastAPI(sessionId, 'logged_out', {});
            }
        },

        onMessage: async (message) => {
            const from = message.key.remoteJid;
            console.log(`[Bridge] Message complet:`, JSON.stringify({
                pushName: message.pushName,
                // Clé complète : on veut voir si WhatsApp fournit senderPn/participantPn
                key: message.key,
                verifiedBizName: message.verifiedBizName,
            }, null, 2));
            // Ignorer les messages système WhatsApp
            if (!from || from === 'status@broadcast' || from.endsWith('@broadcast')) {
                return;
            }

            // ── Accusé de lecture (coches bleues) ─────────────────────────────
            // Marquer le message comme lu dès sa réception, AVANT que l'IA réponde,
            // pour que le client voie les deux coches bleues côté WhatsApp.
            // Échec silencieux : ne doit jamais bloquer le traitement du message.
            try {
                const readSession = activeSessions.get(sessionId);
                if (readSession && readSession.sock) {
                    await readSession.sock.readMessages([message.key]);
                    console.log(`[Bridge] Message marqué comme lu (coches bleues): ${message.key.id}`);
                }
            } catch (e) {
                console.log(`[Bridge] Impossible de marquer le message comme lu: ${e.message}`);
            }

            const text = message.message?.conversation
                || message.message?.extendedTextMessage?.text
                || message.message?.imageMessage?.caption
                || '';

            // ── Détection et téléchargement des médias audio ──────────────────────
            const audioMsg = message.message?.audioMessage || message.message?.pttMessage;
            let mediaType = null;
            let mediaMime = null;
            let mediaUrl = null;

            if (audioMsg) {
                mediaType = message.message?.pttMessage ? 'ptt' : 'audio';
                mediaMime = audioMsg.mimetype || 'audio/ogg; codecs=opus';

                try {
                    const audioBuffer = await downloadMediaMessage(message, 'buffer', {});
                    const ext = /mp4|m4a/.test(mediaMime) ? 'm4a'
                              : /mpeg|mp3/.test(mediaMime) ? 'mp3'
                              : 'ogg';
                    const filename = `audio-${message.key.id}.${ext}`;
                    const filepath = path.join(MEDIA_TEMP_DIR, filename);
                    fs.writeFileSync(filepath, audioBuffer);
                    mediaUrl = `http://whatsapp-engine:3010/media/${filename}`;
                    console.log(`[Bridge] 🎙️ Audio téléchargé: ${filename} (${audioBuffer.length} octets)`);
                } catch (e) {
                    console.warn(`[Bridge] ⚠️ Impossible de télécharger l'audio: ${e.message}`);
                }
            }

            // ── Résolution LID → vrai numéro ──
            // 1) senderPn fourni par WhatsApp (cf. jid-utils.js)
            // 2) sinon, cache Postgres appris des messages précédents (lid-mapping-store.js)
            const { fromClean, fromType, senderPn } = await lidStore.resolve(message, sessionId);

            if (fromType === 'phone_resolved') {
                console.log(`[Bridge] LID résolu via senderPn: ${from} → ${fromClean}`);
            } else if (fromType === 'phone_cached') {
                console.log(`[Bridge] LID résolu via cache Postgres: ${from} → ${fromClean}`);
            } else if (fromType === 'lid') {
                console.log(`[Bridge] LID non résolu (ni senderPn ni cache), conservé: ${from}`);
            }

            console.log(`[Bridge] Message recu dans ${sessionId} de ${fromClean} (${fromType})`);

            await notifyFastAPI(sessionId, 'message_received', {
                from,
                from_clean: fromClean,
                from_type: fromType,
                sender_pn: senderPn,
                push_name: message.pushName || '',
                message_id: message.key.id,
                text,
                timestamp: message.messageTimestamp,
                ...(mediaType ? { media_type: mediaType, media_mime: mediaMime, media_url: mediaUrl } : {}),
            });
        }
    });
}

async function restoreActiveSessions(attempt = 0) {
    console.log(`[Bridge] Recuperation des sessions actives depuis FastAPI... (tentative ${attempt + 1})`);

    try {
        const result = await new Promise((resolve) => {
            const fastapiUrl = new URL(FASTAPI_URL);
            const options = {
                hostname: fastapiUrl.hostname,
                port: fastapiUrl.port || 8000,
                path: '/api/internal/sessions/active',
                method: 'GET',
                headers: { 'X-Internal-Token': 'whatsflow-internal-2026' }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(5000, () => { req.destroy(); resolve(null); });
            req.end();
        });

        // FastAPI pas encore prêt — réessayer
        if (!result || !result.sessions) {
            if (attempt < 5) {
                console.log(`[Bridge] FastAPI pas encore pret, nouvel essai dans 5 secondes...`);
                setTimeout(() => restoreActiveSessions(attempt + 1), 5000);
            } else {
                console.log(`[Bridge] FastAPI inaccessible apres 5 tentatives`);
            }
            return;
        }

        const sessions = result.sessions || [];
        console.log(`[Bridge] ${sessions.length} session(s) a restaurer`);

        for (const sessionId of sessions) {
            console.log(`[Bridge] Restauration: ${sessionId}`);
            startSessionWithCallbacks(sessionId).catch(e => {
                console.error(`[Bridge] Erreur restauration ${sessionId}:`, e.message);
            });
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.warn('[Bridge] Impossible de restaurer les sessions:', e.message);
        if (attempt < 5) {
            setTimeout(() => restoreActiveSessions(attempt + 1), 5000);
        }
    }
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { resolve({}); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    console.log(`[Bridge] ${req.method} ${path}`);

    try {
        if (req.method === 'GET' && path === '/health') {
            sendJSON(res, 200, {
                status: 'ok',
                timestamp: new Date().toISOString(),
                active_sessions: activeSessions.size,
                sessions: Array.from(sessionStatuses.entries()).map(([id, status]) => ({ id, status }))
            });
            return;
        }

        if (req.method === 'GET' && path.startsWith('/media/')) {
            const filename = path.slice('/media/'.length).replace(/\.\./g, '');
            const filepath = require('path').join(MEDIA_TEMP_DIR, filename);

            if (!filename || !fs.existsSync(filepath)) {
                sendJSON(res, 404, { error: 'Fichier non trouvé' });
                return;
            }

            const ext = filename.split('.').pop();
            const mimeMap = { ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' };
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
            fs.createReadStream(filepath).pipe(res);
            return;
        }

        if (req.method === 'GET' && path === '/sessions') {
            const sessions = [];
            for (const [sessionId, status] of sessionStatuses.entries()) {
                const s = getSessionStatus(sessionId);
                sessions.push({ ...s, bridgeStatus: status });
            }
            sendJSON(res, 200, { sessions, count: sessions.length });
            return;
        }

        if (req.method === 'POST' && path === '/session/create') {
            const body = await parseBody(req);
            const sessionId = body.session_id || body.sessionId;
            // Numéro optionnel → connexion par code d'appairage au lieu du QR
            const phoneNumber = body.phone_number
                ? String(body.phone_number).replace(/[^0-9]/g, '')
                : null;

            if (!sessionId) {
                sendJSON(res, 400, { error: 'session_id requis' });
                return;
            }

            const existing = getSessionStatus(sessionId);
            if (existing.isConnected) {
                sendJSON(res, 200, {
                    status: 'already_connected',
                    session_id: sessionId,
                    user_id: existing.userId
                });
                return;
            }

            startSessionWithCallbacks(sessionId, phoneNumber).catch(e => {
                console.error(`[Bridge] Erreur session ${sessionId}:`, e.message);
            });

            sendJSON(res, 200, {
                status: 'starting',
                session_id: sessionId,
                method: phoneNumber ? 'pairing_code' : 'qr',
                message: phoneNumber
                    ? 'Session demarree, code d\'appairage disponible dans ~3 secondes'
                    : 'Session demarree, QR disponible dans ~3 secondes'
            });
            return;
        }

        if (req.method === 'GET' && path.match(/^\/session\/[^/]+\/qr$/)) {
            const sessionId = path.split('/')[2];

            const status = getSessionStatus(sessionId);
            if (status.isConnected) {
                sendJSON(res, 200, { status: 'already_connected', session_id: sessionId, qr: null });
                return;
            }

            const qrData = pendingQRCodes.get(sessionId);
            if (!qrData) {
                sendJSON(res, 404, {
                    error: 'QR non disponible',
                    bridge_status: sessionStatuses.get(sessionId) || 'unknown',
                    message: 'Attends ~3 secondes apres /session/create'
                });
                return;
            }

            if (Date.now() - qrData.timestamp > 300000) {
                pendingQRCodes.delete(sessionId);
                sendJSON(res, 410, { error: 'QR expire, recree la session' });
                return;
            }

            sendJSON(res, 200, {
                qr: qrData.qr,
                session_id: sessionId,
                expires_in: Math.floor((300000 - (Date.now() - qrData.timestamp)) / 1000)
            });
            return;
        }

        if (req.method === 'GET' && path.match(/^\/session\/[^/]+\/pairing-code$/)) {
            const sessionId = path.split('/')[2];

            const status = getSessionStatus(sessionId);
            if (status.isConnected) {
                sendJSON(res, 200, { status: 'already_connected', session_id: sessionId, code: null });
                return;
            }

            const pairingData = pendingPairingCodes.get(sessionId);
            if (!pairingData) {
                sendJSON(res, 404, {
                    error: 'Code d\'appairage non disponible',
                    bridge_status: sessionStatuses.get(sessionId) || 'unknown',
                    message: 'Attends ~3 secondes apres /session/create avec phone_number'
                });
                return;
            }

            // Le code d'appairage expire cote WhatsApp apres ~3 minutes
            if (Date.now() - pairingData.timestamp > 180000) {
                pendingPairingCodes.delete(sessionId);
                sendJSON(res, 410, { error: 'Code expire, recree la session' });
                return;
            }

            sendJSON(res, 200, {
                code: pairingData.code,
                phone: pairingData.phone,
                session_id: sessionId,
                expires_in: Math.floor((180000 - (Date.now() - pairingData.timestamp)) / 1000)
            });
            return;
        }

        if (req.method === 'GET' && path.match(/^\/session\/[^/]+\/status$/)) {
            const sessionId = path.split('/')[2];
            const status = getSessionStatus(sessionId);
            sendJSON(res, 200, {
                ...status,
                bridge_status: sessionStatuses.get(sessionId) || 'unknown'
            });
            return;
        }

        if (req.method === 'POST' && path.match(/^\/session\/[^/]+\/send-message$/)) {
            const sessionId = path.split('/')[2];
            const body = await parseBody(req);
            const { to, message, composing_ms } = body;

            if (!to || !message) {
                sendJSON(res, 400, { error: 'to et message requis' });
                return;
            }

            const jid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

            // Indicateur "en train d'écrire" pendant le délai humain
            if (composing_ms && composing_ms > 0) {
                const session = activeSessions.get(sessionId);
                if (session?.sock) {
                    try {
                        await session.sock.sendPresenceUpdate('composing', jid);
                        await new Promise(r => setTimeout(r, Math.min(composing_ms, 10000)));
                    } catch (e) {
                        console.warn(`[Bridge] sendPresenceUpdate failed: ${e.message}`);
                    }
                }
            }

            const result = await sendMessage(sessionId, jid, { text: message });

            // Fin de l'indicateur
            const session = activeSessions.get(sessionId);
            if (session?.sock) {
                session.sock.sendPresenceUpdate('available', jid).catch(() => {});
            }

            sendJSON(res, 200, { messageId: result.key.id, status: 'sent', to: jid });
            return;
        }

        if (req.method === 'POST' && path.match(/^\/session\/[^/]+\/send-media$/)) {
            const sessionId = path.split('/')[2];
            const body = await parseBody(req);
            const { to, type, url, caption } = body;

            if (!to || !url) {
                sendJSON(res, 400, { error: 'to et url requis' });
                return;
            }

            const jid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            let content = {};
            const mediaType = String(type).toLowerCase();

            if (mediaType.includes('image')) {
                content = { image: { url }, caption: caption || '' };
            } else if (mediaType.includes('video')) {
                content = { video: { url }, caption: caption || '' };
            } else if (mediaType.includes('audio')) {
                content = { audio: { url } };
            } else {
                content = { document: { url }, caption: caption || '', fileName: body.filename || 'document' };
            }

            const result = await sendMessage(sessionId, jid, content);
            sendJSON(res, 200, { messageId: result.key.id, status: 'sent', to: jid });
            return;
        }

        if (req.method === 'DELETE' && path.match(/^\/session\/[^/]+$/)) {
            const sessionId = path.split('/')[2];
            await deleteSession(sessionId);
            sessionStatuses.delete(sessionId);
            pendingQRCodes.delete(sessionId);
            pendingPairingCodes.delete(sessionId);
            sendJSON(res, 200, { status: 'deleted', session_id: sessionId });
            return;
        }

        sendJSON(res, 404, { error: 'Route inconnue', path });

    } catch (error) {
        console.error(`[Bridge] Erreur:`, error.message);
        sendJSON(res, 500, { error: error.message, status: 'error' });
    }
});

server.listen(PORT, async () => {
    console.log(`\n[Bridge] Pont HTTP demarre sur port ${PORT}`);
    console.log(`[Bridge] Notifications vers FastAPI: ${FASTAPI_URL}`);
    console.log(`[Bridge] Routes disponibles:`);
    console.log(`  GET  /health`);
    console.log(`  GET  /sessions`);
    console.log(`  POST /session/create`);
    console.log(`  GET  /session/:id/qr`);
    console.log(`  GET  /session/:id/pairing-code`);
    console.log(`  GET  /session/:id/status`);
    console.log(`  POST /session/:id/send-message`);
    console.log(`  POST /session/:id/send-media`);
    console.log(`  DELETE /session/:id`);
    console.log('');

    setTimeout(restoreActiveSessions, 8000);
});