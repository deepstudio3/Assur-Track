import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

export function useContrats(filters = {}) {
  return useQuery({
    queryKey: ['contrats', filters],
    queryFn: () => api.get('/contrats', { params: filters }).then((r) => r.data),
  });
}

export function useCreateContrat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/contrats', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Contrat enregistré · relances programmées');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function useEnvoyerRelance() {
  return useMutation({
    mutationFn: (contratId) => api.post(`/relances/manuel/${contratId}`).then((r) => r.data),
    onSuccess: () => toast.success('Rappel envoyé'),
    onError: (err) => toast.error(apiError(err)),
  });
}
