import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

/** Renvoie { dettes, remboursements } (le client calcule l'allocation FIFO). */
export function useCaisse() {
  return useQuery({
    queryKey: ['caisse'],
    queryFn: () => api.get('/operations').then((r) => r.data),
  });
}

export function useDeclarerDette() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/operations', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caisse'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function useRembourser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ secretaire_id, montant }) =>
      api.post('/operations/remboursements', { secretaire_id, montant }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caisse'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Remboursement enregistré');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}
