import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { SynapsePolicy } from '@/types';

export function usePolicies() {
  const queryClient = useQueryClient();

  const policiesQuery = useQuery({
    queryKey: ['policies'],
    queryFn: () => api.getPolicies(),
    refetchInterval: 10000,
  });

  const createPolicyMutation = useMutation({
    mutationFn: (data: Partial<SynapsePolicy>) => api.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  return {
    policies: policiesQuery.data || [],
    isLoading: policiesQuery.isLoading,
    isError: policiesQuery.isError,
    error: policiesQuery.error,
    refetch: policiesQuery.refetch,
    createPolicy: createPolicyMutation.mutateAsync,
    isCreating: createPolicyMutation.isPending,
  };
}
