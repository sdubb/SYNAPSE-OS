import { useQuery } from '@tanstack/react-query';
import { WorkspaceDefinition } from '@/types';

const DEFAULT_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: 'ws_primary',
    name: 'synapse-core',
    path: 'C:/Users/lenovo/OneDrive/Desktop/os',
    branch: 'main',
    type: 'LOCAL',
    status: 'READY',
    lastActivity: new Date().toISOString(),
  },
  {
    id: 'ws_sandbox',
    name: 'testing-sandbox',
    path: '/tmp/synapse/sandbox',
    branch: 'feat/checkout-investigation',
    type: 'CONTAINER',
    status: 'READY',
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
  },
];

export function useWorkspaces() {
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<WorkspaceDefinition[]> => {
      return DEFAULT_WORKSPACES;
    },
    staleTime: 30000,
  });

  return {
    workspaces: workspacesQuery.data || DEFAULT_WORKSPACES,
    isLoading: workspacesQuery.isLoading,
    isError: workspacesQuery.isError,
  };
}
