import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });
}

export function useVentesStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats-ventes'],
    queryFn: () => api.get('/dashboard/stats-ventes').then((r) => r.data),
  });
}
