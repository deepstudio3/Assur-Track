import { ForbiddenError } from '../utils/errors.js';

/**
 * Restreint une route à certains rôles.
 * Défense en profondeur : à utiliser après authenticate, en plus du contrôle UI.
 *
 *   router.patch('/:id/rembourser', authenticate, requireRole('patronne'), ...)
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ForbiddenError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Vous n'avez pas les droits pour cette action"));
    }
    next();
  };
}
