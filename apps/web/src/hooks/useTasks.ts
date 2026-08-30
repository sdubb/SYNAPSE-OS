import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.getTasks(),
    staleTime: 5000,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => apiClient.getTaskById(id!),
    enabled: !!id,
    staleTime: 5000,
  });
}
