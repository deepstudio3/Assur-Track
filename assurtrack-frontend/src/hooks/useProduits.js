import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

export function useProduits({ actifsOnly = false } = {}) {
  return useQuery({
    queryKey: ['produits', { actifsOnly }],
    queryFn: () =>
      api.get('/produits', { params: actifsOnly ? { actifs: 'true' } : {} }).then((r) => r.data.data),
  });
}

export function useCreateProduit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/produits', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produits'] });
      toast.success('Produit ajouté au catalogue');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function useUpdateProduit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/produits/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produits'] }),
    onError: (err) => toast.error(apiError(err)),
  });
}
