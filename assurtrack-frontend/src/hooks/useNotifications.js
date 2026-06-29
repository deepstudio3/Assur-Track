import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

/** Notifications in-app de l'utilisateur connecté (rafraîchies périodiquement). */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
