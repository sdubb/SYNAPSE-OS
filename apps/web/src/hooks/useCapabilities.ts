import { useQuery } from '@tanstack/react-query';
import { CapabilityDefinition } from '@/types';

// Standard capabilities supported natively by Cline and Synapse
const DEFAULT_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'cap_fs_read',
    name: 'read_files',
    category: 'FILESYSTEM',
    description: 'Read file contents, inspect source code trees, and browse directories',
    riskLevel: 'LOW',
  },
  {
    id: 'cap_fs_write',
    name: 'write_to_file',
    category: 'FILESYSTEM',
    description: 'Create or overwrite files within designated project workspace',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'cap_fs_edit',
    name: 'replace_file_content',
    category: 'FILESYSTEM',
    description: 'Apply targeted surgical code edits to files',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'cap_cmd_exec',
    name: 'run_command',
    category: 'EXECUTION',
    description: 'Execute shell commands, test suites, linters, and compilers',
    riskLevel: 'HIGH',
  },
  {
    id: 'cap_web_search',
    name: 'search_web',
    category: 'NETWORK',
    description: 'Query documentation and search the public internet',
    riskLevel: 'LOW',
  },
  {
    id: 'cap_browser',
    name: 'read_url_content',
    category: 'NETWORK',
    description: 'Fetch and parse HTML/Markdown web page contents',
    riskLevel: 'LOW',
  },
  {
    id: 'cap_subagents',
    name: 'invoke_subagent',
    category: 'INTELLIGENCE',
    description: 'Spawn and coordinate specialized child subagents concurrently',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'cap_db_query',
    name: 'database_query',
    category: 'DATABASE',
    description: 'Inspect schemas, run migrations, and execute database queries',
    riskLevel: 'CRITICAL',
  },
];

export function useCapabilities() {
  const capabilitiesQuery = useQuery({
    queryKey: ['capabilities'],
    queryFn: async (): Promise<CapabilityDefinition[]> => {
      // Future: load remote MCP / dynamic registered tools
      return DEFAULT_CAPABILITIES;
    },
    staleTime: 60000,
  });

  return {
    capabilities: capabilitiesQuery.data || DEFAULT_CAPABILITIES,
    isLoading: capabilitiesQuery.isLoading,
    isError: capabilitiesQuery.isError,
  };
}
