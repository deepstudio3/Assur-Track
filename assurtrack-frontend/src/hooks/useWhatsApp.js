import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

/** État de la connexion WhatsApp de l'entreprise. `poll` = sonde pendant la connexion. */
export function useWaStatus(poll = false) {
  return useQuery({
    queryKey: ['wa', 'status'],
    queryFn: () => api.get('/whatsapp/status').then((r) => r.data),
    refetchOnWindowFocus: true,
    refetchInterval: poll ? 4000 : false,
  });
}

/**
 * QR code à scanner. Activé uniquement pendant la phase de connexion,
 * sondé toutes les 3 s (le QR WhatsFlow expire et se régénère).
 */
export function useWaQr(enabled) {
  return useQuery({
    queryKey: ['wa', 'qr'],
    queryFn: () => api.get('/whatsapp/qr').then((r) => r.data),
    enabled,
    refetchInterval: enabled ? 3000 : false,
    refetchOnWindowFocus: false,
  });
}

export function useWaConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/whatsapp/connect').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function useWaRestart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/whatsapp/restart').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa'] });
      toast.success('Nouveau QR code généré');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function useWaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/whatsapp/session').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa'] });
      toast.success('WhatsApp déconnecté');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}
