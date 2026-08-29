import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { WorldEntity } from '@/types';

export function useWorld() {
  const queryClient = useQueryClient();

  const worldQuery = useQuery({
    queryKey: ['world-entities'],
    queryFn: () => api.getWorldEntities(),
    refetchInterval: 10000,
  });

  const createEntityMutation = useMutation({
    mutationFn: (data: Partial<WorldEntity>) => api.createWorldEntity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world-entities'] });
    },
  });

  return {
    entities: worldQuery.data || [],
    isLoading: worldQuery.isLoading,
    isError: worldQuery.isError,
    error: worldQuery.error,
    refetch: worldQuery.refetch,
    createEntity: createEntityMutation.mutateAsync,
    isCreating: createEntityMutation.isPending,
  };
}
