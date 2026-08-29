import {
  VerificationMetricsSummary,
  VerifiedTaskItem,
  AssertionDetail,
  GroundTruthComparison,
  MerkleEvidenceChain,
  ApprovalRequestItem,
  PolicyDefinition,
  AuditLogEntry,
  WorldEntityNode,
  WorldRelationshipEdge,
  WorldSnapshot,
  SimulationFaultInjection,
  MonteCarloSweepConfig,
  SimulationImpactAnalysis,
  AutomationWorkflow,
  ConnectedCapability,
  WorkspaceConfig,
  LLMModelInfo,
  ProviderCredential,
  TenantOrgSettings,
  UserRoleItem,
} from '../types/trust-governance.js';

const API_BASE = (typeof window !== 'undefined' && (window as unknown as { __SYNAPSE_API_URL__?: string }).__SYNAPSE_API_URL__) || '/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': (typeof window !== 'undefined' && localStorage.getItem('synapse_tenant_id')) || 'default_tenant',
      ...(typeof window !== 'undefined' && localStorage.getItem('synapse_auth_token')
        ? { Authorization: `Bearer ${localStorage.getItem('synapse_auth_token')}` }
        : { Authorization: 'Bearer dev_token' }),
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// ----------------------------------------------------
// 1. Verification & Trust Center API
// ----------------------------------------------------
export const verificationApi = {
  getMetrics: async (): Promise<VerificationMetricsSummary> => {
    const tasks = await fetchJson<any[]>('/verification').catch(() => []);
    const completed = tasks.length;
    const passed = tasks.filter((t: any) => t.verdict === 'PASS').length;
    const failed = tasks.filter((t: any) => t.verdict === 'FAIL').length;
    const inReview = tasks.filter((t: any) => t.verdict === 'REVIEW').length;
    const passRate = completed > 0 ? Math.round((passed / completed) * 100) : 100;
    return {
      completed,
      passed,
      failed,
      inReview,
      passRatePercentage: passRate,
      avgVerificationTimeMs: 0,
    };
  },

  getTasks: async (): Promise<VerifiedTaskItem[]> => {
    return fetchJson<VerifiedTaskItem[]>('/verification').catch(() => []);
  },

  getTaskDetail: async (verificationId: string): Promise<VerifiedTaskItem | null> => {
    return fetchJson<VerifiedTaskItem>(`/verification/${verificationId}`).catch(() => null);
  },

  getDetail: async (id: string): Promise<{
    task: VerifiedTaskItem | null;
    comparison: GroundTruthComparison | null;
    assertions: AssertionDetail[];
    evidenceChain: MerkleEvidenceChain | null;
  }> => {
    const [task, comparison, assertions, evidenceChain] = await Promise.all([
      fetchJson<VerifiedTaskItem>(`/verification/${id}`).catch(() => null),
      fetchJson<GroundTruthComparison>(`/verification/${id}/comparison`).catch(() => null),
      fetchJson<AssertionDetail[]>(`/verification/${id}/assertions`).catch(() => []),
      fetchJson<MerkleEvidenceChain>(`/verification/${id}/evidence-chain`).catch(() => null),
    ]);
    return { task, comparison, assertions, evidenceChain };
  },

  getAssertions: async (verificationId: string): Promise<AssertionDetail[]> => {
    return fetchJson<AssertionDetail[]>(`/verification/${verificationId}/assertions`).catch(() => []);
  },

  getGroundTruthComparison: async (verificationId: string): Promise<GroundTruthComparison | null> => {
    return fetchJson<GroundTruthComparison>(`/verification/${verificationId}/comparison`).catch(() => null);
  },

  getEvidenceChain: async (verificationId: string): Promise<MerkleEvidenceChain | null> => {
    return fetchJson<MerkleEvidenceChain>(`/verification/${verificationId}/evidence-chain`).catch(() => null);
  },
};

// ----------------------------------------------------
// 2. Governance & Approvals API
// ----------------------------------------------------
export const governanceApi = {
  getApprovals: async (): Promise<ApprovalRequestItem[]> => {
    return fetchJson<ApprovalRequestItem[]>('/approvals').catch(() => []);
  },

  resolveApproval: async (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<{ success: boolean; id: string; status: string }> => {
    return fetchJson<{ success: boolean; id: string; status: string }>(`/approvals/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    });
  },

  decideApproval: async (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    return governanceApi.resolveApproval(id, decision, reason);
  },

  getPolicies: async (): Promise<PolicyDefinition[]> => {
    return fetchJson<PolicyDefinition[]>('/policies').catch(() => []);
  },

  savePolicy: async (policy: Partial<PolicyDefinition>): Promise<PolicyDefinition> => {
    return fetchJson<PolicyDefinition>('/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  },

  deletePolicy: async (id: string): Promise<{ success: boolean }> => {
    return fetchJson<{ success: boolean }>(`/policies/${id}`, {
      method: 'DELETE',
    });
  },

  getAuditLogs: async (filters?: {
    agentId?: string;
    userId?: string;
    action?: string;
    riskLevel?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> => {
    const params = new URLSearchParams();
    if (filters?.agentId) params.set('agentId', filters.agentId);
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.action) params.set('action', filters.action);
    if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const res = await fetchJson<{ records: AuditLogEntry[] } | AuditLogEntry[]>(`/audit?${params.toString()}`).catch(() => []);
    if (Array.isArray(res)) return res;
    return res.records || [];
  },

  exportAuditLogs: async (format: 'CEF' | 'SYSLOG' | 'JSONL'): Promise<string> => {
    const res = await fetch(`${API_BASE}/audit/export?format=${format}`, {
      headers: {
        'X-Tenant-Id': (typeof window !== 'undefined' && localStorage.getItem('synapse_tenant_id')) || 'default_tenant',
        Authorization: 'Bearer dev_token',
      },
    });
    return res.text();
  },
};

// ----------------------------------------------------
// 3. World Studio & Digital Twin API
// ----------------------------------------------------
export const worldApi = {
  getEntities: async (): Promise<WorldEntityNode[]> => {
    return fetchJson<WorldEntityNode[]>('/world/entities').catch(() => []);
  },

  getEdges: async (): Promise<WorldRelationshipEdge[]> => {
    return fetchJson<WorldRelationshipEdge[]>('/world/relationships').catch(() => []);
  },

  getSnapshots: async (): Promise<WorldSnapshot[]> => {
    return fetchJson<WorldSnapshot[]>('/world/snapshots').catch(() => []);
  },

  getWorldTopology: async (): Promise<{
    entities: WorldEntityNode[];
    relationships: WorldRelationshipEdge[];
    snapshots: WorldSnapshot[];
  }> => {
    const [entities, relationships, snapshots] = await Promise.all([
      worldApi.getEntities(),
      worldApi.getEdges(),
      worldApi.getSnapshots(),
    ]);
    return { entities, relationships, snapshots };
  },

  runSimulation: async (
    fault: SimulationFaultInjection | { faults: SimulationFaultInjection[]; monteCarlo: MonteCarloSweepConfig },
    monteCarlo?: MonteCarloSweepConfig
  ): Promise<SimulationImpactAnalysis> => {
    const payload = 'faults' in fault
      ? fault
      : { faults: [fault], monteCarlo: monteCarlo || { iterations: 100, concurrencyLevel: 10, failureRateVariations: [0.1, 0.25], trafficSpikeMultipliers: [1, 2] } };
    return fetchJson<SimulationImpactAnalysis>('/simulations/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ----------------------------------------------------
// 4. Automation & Workflows API
// ----------------------------------------------------
export const automationApi = {
  getWorkflows: async (): Promise<AutomationWorkflow[]> => {
    return fetchJson<AutomationWorkflow[]>('/schedules').catch(() => []);
  },

  toggleWorkflow: async (id: string, enabled: boolean): Promise<AutomationWorkflow> => {
    return fetchJson<AutomationWorkflow>(`/schedules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  },

  triggerWorkflow: async (workflowId: string): Promise<{ runId: string; status: string }> => {
    return fetchJson<{ runId: string; status: string }>(`/schedules/${workflowId}/trigger`, {
      method: 'POST',
    });
  },
};

// ----------------------------------------------------
// 5. Capabilities & Workspaces API
// ----------------------------------------------------
export const capabilitiesApi = {
  getCapabilities: async (): Promise<ConnectedCapability[]> => {
    return fetchJson<ConnectedCapability[]>('/connectors').catch(() => []);
  },
};

export const workspacesApi = {
  getWorkspaces: async (): Promise<WorkspaceConfig[]> => {
    return fetchJson<WorkspaceConfig[]>('/tenants/workspaces').catch(() => []);
  },

  getWorkspaceDetail: async (id: string): Promise<(WorkspaceConfig & {
    environmentVariables: Record<string, string>;
    mountedDirectories: string[];
    securityProfile: { readOnlyRoot: boolean; networkEgressAllowList: string[] };
  }) | null> => {
    const res = await fetchJson<any>(`/tenants/workspaces/${id}`).catch(() => null);
    if (!res) return null;
    return {
      environmentVariables: {},
      mountedDirectories: [],
      securityProfile: { readOnlyRoot: true, networkEgressAllowList: [] },
      ...res,
    };
  },
};

// ----------------------------------------------------
// 6. System Configuration API
// ----------------------------------------------------
export const systemApi = {
  getModels: async (): Promise<LLMModelInfo[]> => {
    return fetchJson<LLMModelInfo[]>('/external-agents/models').catch(() => []);
  },

  toggleModel: async (id: string, active: boolean) => {
    return fetchJson(`/external-agents/models/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
  },

  deleteModel: async (id: string) => {
    return fetchJson(`/external-agents/models/${id}`, { method: 'DELETE' });
  },

  createModel: async (model: Partial<LLMModelInfo>) => {
    return fetchJson('/external-agents/models', { method: 'POST', body: JSON.stringify(model) });
  },

  getProviders: async (): Promise<ProviderCredential[]> => {
    return fetchJson<ProviderCredential[]>('/external-agents/providers').catch(() => []);
  },

  addProvider: async (provider: Partial<ProviderCredential>) => {
    return fetchJson('/external-agents/providers', { method: 'POST', body: JSON.stringify(provider) });
  },

  validateProvider: async (id: string) => {
    return fetchJson<{ valid: boolean; message: string }>(`/external-agents/providers/${id}/validate`, { method: 'POST' });
  },

  deleteProvider: async (id: string) => {
    return fetchJson(`/external-agents/providers/${id}`, { method: 'DELETE' });
  },

  getSettings: async (): Promise<TenantOrgSettings> => {
    return fetchJson<TenantOrgSettings>('/tenants/current').catch(() => ({
      id: 'default_tenant',
      name: 'Default Organization',
      plan: 'ENTERPRISE',
      primaryContactEmail: 'admin@synapse.local',
      allowedIPs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationName: 'Synapse Enterprise',
      tenantId: 'default_tenant',
      planTier: 'ENTERPRISE',
      seatsAllocated: 10,
      seatsUsed: 1,
      mfaRequired: true,
      dataRetentionDays: 90,
      auditExportWebhook: '',
    } as any));
  },

  getTenantSettings: async (): Promise<{ org: TenantOrgSettings; users: UserRoleItem[] }> => {
    const [org, users] = await Promise.all([
      systemApi.getSettings(),
      systemApi.getUsers(),
    ]);
    return { org, users };
  },

  getUsers: async (): Promise<UserRoleItem[]> => {
    return fetchJson<UserRoleItem[]>('/tenants/users').catch(() => []);
  },
};
