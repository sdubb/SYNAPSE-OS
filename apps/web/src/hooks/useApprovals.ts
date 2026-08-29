import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ToolApprovalRequest } from '@/types';

export function useApprovals() {
  const queryClient = useQueryClient();

  const approvalsQuery = useQuery({
    queryKey: ['approvals'],
    queryFn: () => api.getApprovals(),
    refetchInterval: 3000,
  });

  const resolveApprovalMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: 'APPROVED' | 'REJECTED';
      reason?: string;
    }) => api.resolveApproval(id, decision, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const approvalsArray = Array.isArray(approvalsQuery.data) ? approvalsQuery.data : [];
  const pendingApprovals = approvalsArray.filter(
    (a) => (a.status as string)?.toLowerCase() === 'pending'
  );


  return {
    approvals: approvalsArray,
    pendingApprovals,
    pendingCount: pendingApprovals.length,
    isLoading: approvalsQuery.isLoading,
    isError: approvalsQuery.isError,
    error: approvalsQuery.error,
    refetch: approvalsQuery.refetch,
    resolveApproval: resolveApprovalMutation.mutateAsync,
    isResolving: resolveApprovalMutation.isPending,
  };
}
