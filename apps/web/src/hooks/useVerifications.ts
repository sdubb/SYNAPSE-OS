import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useVerifications() {
  return useQuery({
    queryKey: ['verifications'],
    queryFn: () => apiClient.getVerifications(),
    staleTime: 10000,
  });
}
