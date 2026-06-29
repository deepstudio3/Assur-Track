import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { apiError } from '../api/client';

/**
 * Authentification réelle (API). Le JWT est stocké dans localStorage
 * ('assurtrack_token') et injecté par l'intercepteur axios.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async ({ email, password }) => {
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('assurtrack_token', data.token);
          set({ user: data.user, isAuthenticated: true });
          return data.user;
        } catch (err) {
          const e = new Error(apiError(err, 'Identifiants incorrects'));
          e.code = 'AUTH_INVALID';
          throw e;
        }
      },

      logout: () => {
        localStorage.removeItem('assurtrack_token');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'assurtrack_auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
