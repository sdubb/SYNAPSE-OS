import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { VerificationResult } from '@/types';

export function useVerification() {
  const queryClient = useQueryClient();

  const verificationsQuery = useQuery({
    queryKey: ['verifications'],
    queryFn: () => api.getVerifications(),
    refetchInterval: 5000,
  });

  const createVerificationMutation = useMutation({
    mutationFn: (data: Partial<VerificationResult>) => api.createVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
  });

  return {
    verifications: Array.isArray(verificationsQuery.data) ? verificationsQuery.data : [],
    isLoading: verificationsQuery.isLoading,
    isError: verificationsQuery.isError,
    error: verificationsQuery.error,
    refetch: verificationsQuery.refetch,
    createVerification: createVerificationMutation.mutateAsync,
    isCreating: createVerificationMutation.isPending,
  };
}
