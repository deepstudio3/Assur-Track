import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 12000,
});

// Ajoute le JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('assurtrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → purge le token et renvoie vers /login (sauf sur la route de login elle-même)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('assurtrack_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

/** Extrait un message d'erreur lisible depuis une erreur axios. */
export function apiError(err, fallback = 'Une erreur est survenue') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export default api;
