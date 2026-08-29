import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export function useAudit(params?: { limit?: number; offset?: number; eventType?: string }) {
  const auditQuery = useQuery({
    queryKey: ['audit', params],
    queryFn: () => api.getAuditLogs(params),
    refetchInterval: 5000,
  });

  return {
    records: auditQuery.data?.records || [],
    total: auditQuery.data?.total || 0,
    hasMore: auditQuery.data?.hasMore || false,
    isLoading: auditQuery.isLoading,
    isError: auditQuery.isError,
    error: auditQuery.error,
    refetch: auditQuery.refetch,
  };
}
