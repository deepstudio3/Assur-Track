/**
 * Contrôle d'accès par rôle, côté interface.
 * Défense en profondeur : le backend revérifie toujours (voir notes du brief).
 */
export const ROLES = {
  PATRONNE: 'patronne',
  SECRETAIRE: 'secretaire',
  ADMIN: 'admin',
};

export function canAccess(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
}

export function isPatronne(user) {
  return user?.role === ROLES.PATRONNE;
}

export function isSecretaire(user) {
  return user?.role === ROLES.SECRETAIRE;
}
