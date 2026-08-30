import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useSimulations() {
  return useQuery({
    queryKey: ['simulations'],
    queryFn: () => apiClient.getSimulations(),
    staleTime: 10000,
  });
}
