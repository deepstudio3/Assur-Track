const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const winston = require("winston");
const QRCode = require('qrcode');
require("dotenv").config();
const { createSession, sendMessage, activeSessions, lidStore } = require("./whatsapp-engine");
const { RedisClient } = require("./redis-client");

const INTERNAL_TOKEN = process.env.WHATSFLOW_INTERNAL_TOKEN || "whatsflow-internal-2026";
const WHATSFLOW_HOST = process.env.WHATSAPP_BRIDGE_HOST || "whatsflow-backend";
const WHATSFLOW_PORT = 8000;

/**
 * Notifie WhatsFlow d'un événement de session avec retry exponentiel.
 * Jusqu'à 3 tentatives : délais 1s, 2s, 4s.
 */
async function notifyWhatsFlow(sessionId, event, data, attempt = 1) {
  return new Promise((resolve) => {
    const http = require("http");
    const payload = JSON.stringify({ event, data: data || {} });
    const req = http.request({
      hostname: WHATSFLOW_HOST,
      port: WHATSFLOW_PORT,
      path: `/api/internal/session/${sessionId}/event`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "x-internal-token": INTERNAL_TOKEN,
      }
    }, (res) => {
      res.resume();
      logger.info(`📡 [${attempt}/3] Événement ${event} envoyé à WhatsFlow pour ${sessionId} → HTTP ${res.statusCode}`);
      resolve(true);
    });

    req.on("error", async (err) => {
      logger.warn(`⚠️ [${attempt}/3] Erreur notification WhatsFlow (${event} / ${sessionId}): ${err.message}`);
      if (attempt < 3) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        resolve(notifyWhatsFlow(sessionId, event, data, attempt + 1));
      } else {
        logger.error(`❌ Abandon après 3 tentatives: ${event} pour ${sessionId}`);
        resolve(false);
      }
    });

    req.write(payload);
    req.end();
  });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${message} ${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

const PORT = process.env.PORT || 3010;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const app = express();
const redisClient = new RedisClient(REDIS_URL, logger);

// QR codes par session
const sessionQRCodes = new Map();
const sessionStatuses = new Map();

app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    const redisPing = await redisClient.ping();
    res.json({
      status: "healthy",
      port: PORT,
      sessions: activeSessions.size,
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(503).json({ status: "unhealthy", error: e.message });
  }
});

// ── Créer une session ─────────────────────────────────────────
app.post("/session/create", async (req, res) => {
  const { sessionId, phoneNumber } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId requis" });
  }
  if (activeSessions.has(sessionId)) {
    return res.json({ sessionId, status: "already_exists" });
  }
  try {
    sessionStatuses.set(sessionId, 'starting');
    sessionQRCodes.delete(sessionId);

    createSession(sessionId, {
      phoneNumber,
      onQR: async (qr) => {
        const qrImage = await QRCode.toDataURL(qr);
        sessionQRCodes.set(sessionId, qrImage);
        sessionStatuses.set(sessionId, 'qr_ready');
        await redisClient.setQRCode(sessionId, qrImage);
        logger.info(`✅ QR généré pour session: ${sessionId}`);
      },
      onStatusChange: async (status) => {
        const statusStr = typeof status === "object" ? JSON.stringify(status) : status;
        const statusType = typeof status === "object" ? status.type : status;
        sessionStatuses.set(sessionId, statusType);
        logger.info(`🔄 Status ${sessionId}: ${statusStr}`);
        
        // Notifier WhatsFlow via endpoint interne (avec retry)
        notifyWhatsFlow(sessionId, statusType, typeof status === "object" ? status : {})
          .catch(e => logger.error(`❌ Erreur notification WhatsFlow: ${e.message}`));

        if (statusType === "connected") {
          sessionQRCodes.delete(sessionId);
        }
      },
      onMessage: async (msg) => {
        logger.info(`📨 Message reçu sur ${sessionId} de ${msg.key.remoteJid}`);
        const text = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || "";
        notifyWhatsFlow(sessionId, "message_received", {
          from: msg.key.remoteJid,
          from_clean: msg.key.remoteJid,
          from_type: msg.key.remoteJid.includes("@g.us") ? "group" : "individual",
          message_id: msg.key.id,
          text: text,
          timestamp: new Date().toISOString(),
          is_group: msg.key.remoteJid.includes("@g.us"),
          push_name: msg.pushName || ""
        }).catch(e => logger.error(`❌ Erreur envoi message à WhatsFlow: ${e.message}`));
      }
    });

    res.json({ sessionId, status: "starting" });
  } catch (e) {
    logger.error(`Erreur création session ${sessionId}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ── QR code d'une session ─────────────────────────────────────
app.get("/session/:sessionId/qr", async (req, res) => {
  const { sessionId } = req.params;
  const status = sessionStatuses.get(sessionId) || 'unknown';

  if (status === 'connected') {
    return res.json({ sessionId, status: 'connected', qr: null });
  }

  const qr = sessionQRCodes.get(sessionId)
    || await redisClient.getQRCode(sessionId);

  if (qr) {
    return res.json({ sessionId, status: 'qr_ready', qr });
  }

  res.json({ sessionId, status, qr: null });
});

// ── Status d'une session ──────────────────────────────────────
app.get("/session/:sessionId/status", async (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  res.json({
    sessionId,
    status: sessionStatuses.get(sessionId) || 'unknown',
    connected: session?.isConnected || false
  });
});

// ── Supprimer une session ─────────────────────────────────────
app.delete("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  if (session) {
    await session.logout?.();
    activeSessions.delete(sessionId);
  }
  sessionQRCodes.delete(sessionId);
  sessionStatuses.delete(sessionId);
  await redisClient.setQRCode(sessionId, null);
  res.json({ sessionId, status: "deleted" });
});

// ── Envoyer un message ────────────────────────────────────────
app.post("/session/:sessionId/send-message", async (req, res) => {
  const { sessionId } = req.params;
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "to et message requis" });
  }
  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    const result = await sendMessage(sessionId, jid, { text: message });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Route legacy /qr (compatibilité) ─────────────────────────
app.get("/qr", async (req, res) => {
  // Retourne le QR de la première session disponible
  for (const [sessionId, qr] of sessionQRCodes.entries()) {
    return res.json({ sessionId, qr, timestamp: new Date().toISOString() });
  }
  res.status(404).json({ error: "Aucun QR disponible" });
});

app.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Engine démarré sur port ${PORT} (multi-session)`);
  redisClient.connect().then(async () => {
    logger.info(`✅ Redis connecté`);
    // Restaurer les sessions actives depuis WhatsFlow
    await restoreActiveSessions();
  });
});

async function restoreActiveSessions() {
  try {
    // Attendre que WhatsFlow soit prêt
    await new Promise(r => setTimeout(r, 5000));
    
    const http = require("http");
    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: "whatsflow-backend",
        port: 8000,
        path: "/api/internal/sessions/active",
        method: "GET",
        headers: {
          "x-internal-token": "whatsflow-internal-2026"
        }
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve(JSON.parse(data)));
      });
      req.on("error", reject);
      req.end();
    });

    const sessions = response.sessions || [];
    logger.info(`🔄 Restauration de ${sessions.length} session(s) active(s)...`);

    for (const sessionId of sessions) {
      logger.info(`🔌 Restauration session: ${sessionId}`);
      try {
        await createSessionWithHandlers(sessionId);
        // Délai entre les sessions pour éviter de surcharger WhatsApp
        await new Promise(r => setTimeout(r, 3000));
      } catch(e) {
        logger.error(`❌ Erreur restauration ${sessionId}: ${e.message}`);
      }
    }
    logger.info(`✅ Restauration terminée`);
  } catch(e) {
    logger.warn(`⚠️ Restauration sessions échouée: ${e.message}`);
  }
}

function createSessionWithHandlers(sessionId) {
  return new Promise((resolve, reject) => {
    sessionStatuses.set(sessionId, "starting");
    createSession(sessionId, {
      onQR: async (qr) => {
        const QRCode = require("qrcode");
        const qrImage = await QRCode.toDataURL(qr);
        sessionQRCodes.set(sessionId, qrImage);
        sessionStatuses.set(sessionId, "qr_ready");
        await redisClient.setQRCode(sessionId, qrImage);
        logger.info(`✅ QR généré pour session: ${sessionId}`);
      },
      onStatusChange: async (status) => {
        const statusStr = typeof status === "object" ? JSON.stringify(status) : status;
        const statusType = typeof status === "object" ? status.type : status;
        sessionStatuses.set(sessionId, statusType);
        logger.info(`🔄 Status ${sessionId}: ${statusStr}`);
        notifyWhatsFlow(sessionId, statusType, typeof status === "object" ? status : {})
          .catch(e => logger.error(`❌ Erreur notification WhatsFlow: ${e.message}`));
        if (statusType === "connected") {
          sessionQRCodes.delete(sessionId);
          resolve();
        }
      },
      onMessage: async (msg) => {
        logger.info(`📨 Message reçu sur ${sessionId} de ${msg.key.remoteJid}`);
        const text = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || "";
        notifyWhatsFlow(sessionId, "message_received", {
          from: msg.key.remoteJid,
          from_clean: msg.key.remoteJid,
          from_type: msg.key.remoteJid.includes("@g.us") ? "group" : "individual",
          message_id: msg.key.id,
          text: text,
          timestamp: new Date().toISOString(),
          is_group: msg.key.remoteJid.includes("@g.us"),
          push_name: msg.pushName || ""
        }).catch(e => logger.error(`❌ Erreur envoi message à WhatsFlow: ${e.message}`));
      }
    }).catch(reject);
    // Timeout si la session ne se reconnecte pas en 60s
    setTimeout(() => resolve(), 60000);
  });
}
