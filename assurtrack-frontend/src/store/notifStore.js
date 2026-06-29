import { create } from 'zustand';

/**
 * Notifications temps réel (mock). En production, alimenté par un canal
 * WebSocket/SSE déclenché par les événements caisse et relance.
 */
const seed = [
  { id: 'n1', type: 'caisse', titre: 'Nouvelle avance enregistrée', detail: 'Aïcha B. · 40 000 FCFA · carburant', read: false, at: Date.now() - 6 * 60 * 1000 },
  { id: 'n2', type: 'relance', titre: 'Relance J-0 envoyée', detail: 'Mballa Étienne · POL-2291', read: false, at: Date.now() - 42 * 60 * 1000 },
  { id: 'n3', type: 'relance', titre: 'Échec d’envoi', detail: 'Fotso Bernard · numéro injoignable', read: true, at: Date.now() - 3 * 3600 * 1000 },
];

export const useNotifStore = create((set, get) => ({
  notifications: seed,
  get unreadCount() {
    return get().notifications.filter((n) => !n.read).length;
  },
  push: (n) =>
    set((s) => ({
      notifications: [{ id: crypto.randomUUID(), read: false, at: Date.now(), ...n }, ...s.notifications],
    })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));
