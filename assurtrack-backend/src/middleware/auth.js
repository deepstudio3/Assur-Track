import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Vérifie le JWT du header Authorization: Bearer <token>.
 * Renseigne req.user = { id, role, entreprise_id }.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Jeton manquant'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.sub,
      role: payload.role,
      entreprise_id: payload.entreprise_id,
    };
    next();
  } catch {
    next(new UnauthorizedError('Jeton invalide ou expiré'));
  }
}
