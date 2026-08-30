import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
    staleTime: 15000,
    retry: 1,
  });
}
