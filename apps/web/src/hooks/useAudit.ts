import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useAuditLogs(params?: { limit?: number; offset?: number; eventType?: string }) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => apiClient.getAuditLogs(params),
    staleTime: 10000,
  });
}
