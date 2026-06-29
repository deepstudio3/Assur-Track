import { AppError } from '../utils/errors.js';
import { isProd } from '../config/env.js';

/** 404 pour les routes non trouvées. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route inconnue : ${req.method} ${req.originalUrl}` } });
}

/** Gestionnaire d'erreurs global. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Violations de contraintes PostgreSQL → messages clairs
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Cette valeur existe déjà' } });
  }
  if (err.code === '23514' || err.code === '23502') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Données invalides' } });
  }
  // Garde-fou d'immuabilité (trigger SQL) → 403
  if (err.code === 'P0001') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message.replace(/^.*?:\s*/, '') } });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  console.error('[error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: isProd ? 'Erreur interne du serveur' : err.message,
    },
  });
}
