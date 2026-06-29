import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/client';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data.data),
  });
}

export function useSaveTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templates) => api.put('/templates', { templates }).then((r) => r.data.data),
    onSuccess: (data) => {
      qc.setQueryData(['templates'], data);
      toast.success('Templates enregistrés');
    },
    onError: (err) => toast.error(apiError(err)),
  });
}
