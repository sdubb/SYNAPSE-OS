import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: () => apiClient.getApprovals(),
    staleTime: 5000,
  });
}
