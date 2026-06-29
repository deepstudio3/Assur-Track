import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

export function useContratDocuments(contratId, enabled = true) {
  return useQuery({
    queryKey: ['contrat-documents', contratId],
    queryFn: () => api.get(`/contrats/${contratId}/documents`).then((r) => r.data.data),
    enabled: Boolean(contratId) && enabled,
  });
}

export function useUploadContratDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contratId, files }) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      return api.post(`/contrats/${contratId}/documents`, fd).then((r) => r.data.data);
    },
    onSuccess: (_d, { contratId }) => {
      qc.invalidateQueries({ queryKey: ['contrat-documents', contratId] });
      qc.invalidateQueries({ queryKey: ['contrats'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

export function useDeleteContratDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId) => api.delete(`/contrats/documents/${docId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrat-documents'] });
      qc.invalidateQueries({ queryKey: ['contrats'] });
      toast.success('Document supprimé');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}

/** Récupère un document (blob, avec auth) et l'ouvre dans un nouvel onglet. */
export async function openDocument(docId) {
  try {
    const res = await api.get(`/contrats/documents/${docId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    toast.error(apiError(err, "Impossible d'ouvrir le document"));
  }
}
