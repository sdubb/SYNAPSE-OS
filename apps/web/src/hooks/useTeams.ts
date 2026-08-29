import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { SynapseTeam } from '@/types';

export function useTeams() {
  const queryClient = useQueryClient();

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(),
    refetchInterval: 10000,
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: Partial<SynapseTeam>) => api.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  return {
    teams: teamsQuery.data || [],
    isLoading: teamsQuery.isLoading,
    isError: teamsQuery.isError,
    error: teamsQuery.error,
    refetch: teamsQuery.refetch,
    createTeam: createTeamMutation.mutateAsync,
    isCreating: createTeamMutation.isPending,
  };
}
