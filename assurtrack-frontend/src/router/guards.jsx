import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canAccess } from '../utils/roleGuard';

/** Exige une session active, sinon redirige vers /login. */
export function RequireAuth({ children }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Restreint l'accès à certains rôles. Défense en profondeur (le backend revérifie). */
export function RequireRole({ roles, children, redirect = '/' }) {
  const user = useAuthStore((s) => s.user);
  if (!canAccess(user?.role, roles)) {
    return <Navigate to={redirect} replace />;
  }
  return children;
}
