import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { AgentDefinition } from '@/types';

export function useAgents() {
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.getAgents(),
    refetchInterval: 10000,
  });

  const createAgentMutation = useMutation({
    mutationFn: (data: Partial<AgentDefinition>) => api.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  return {
    agents: agentsQuery.data || [],
    isLoading: agentsQuery.isLoading,
    isError: agentsQuery.isError,
    error: agentsQuery.error,
    refetch: agentsQuery.refetch,
    createAgent: createAgentMutation.mutateAsync,
    isCreating: createAgentMutation.isPending,
  };
}
