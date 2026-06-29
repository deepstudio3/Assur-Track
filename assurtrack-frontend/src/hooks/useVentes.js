import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

export function useVentes(params = {}) {
  return useQuery({
    queryKey: ['ventes', params],
    queryFn: () => api.get('/ventes', { params }).then((r) => r.data.data),
  });
}

export function useVentesDettes() {
  return useQuery({
    queryKey: ['ventes', 'dettes'],
    queryFn: () => api.get('/ventes/dettes').then((r) => r.data.data),
  });
}

export function useCreateVente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/ventes', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function usePayerDette() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, montant }) => api.post(`/ventes/${id}/payer`, montant != null ? { montant } : {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Paiement enregistré — la patronne a été notifiée');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}
