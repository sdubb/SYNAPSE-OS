import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useSessions(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => apiClient.getSessions(params),
    staleTime: 5000,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => apiClient.getSession(id!),
    enabled: !!id,
    staleTime: 5000,
  });
}
