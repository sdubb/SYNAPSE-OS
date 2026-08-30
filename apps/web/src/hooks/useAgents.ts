import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.getAgents(),
    staleTime: 10000,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => apiClient.getAgentById(id!),
    enabled: !!id,
    staleTime: 10000,
  });
}
