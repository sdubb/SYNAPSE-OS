import { useState, useEffect, useCallback } from 'react';
import {
  verificationApi,
  governanceApi,
  worldApi,
  automationApi,
  capabilitiesApi,
  workspacesApi,
  systemApi,
} from '../api/trust-governance-client.js';
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

// --- Verification Hook ---
export function useVerification() {
  const [metrics, setMetrics] = useState<VerificationMetricsSummary | null>(null);
  const [tasks, setTasks] = useState<VerifiedTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [m, t] = await Promise.all([
        verificationApi.getMetrics(),
        verificationApi.getTasks(),
      ]);
      setMetrics(m);
      setTasks(t);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, tasks, loading, error, refresh };
}

export function useVerificationDetail(id: string) {
  const [task, setTask] = useState<VerifiedTaskItem | null>(null);
  const [comparison, setComparison] = useState<GroundTruthComparison | null>(null);
  const [assertions, setAssertions] = useState<AssertionDetail[]>([]);
  const [evidenceChain, setEvidenceChain] = useState<MerkleEvidenceChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await verificationApi.getDetail(id);
      setTask(res.task);
      setComparison(res.comparison);
      setAssertions(res.assertions);
      setEvidenceChain(res.evidenceChain);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { task, comparison, assertions, evidenceChain, loading, error, refresh };
}

// --- Governance Hook (Approvals, Policies, Audit) ---
export function useGovernance() {
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([]);
  const [policies, setPolicies] = useState<PolicyDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [apprs, pols, audits] = await Promise.all([
        governanceApi.getApprovals(),
        governanceApi.getPolicies(),
        governanceApi.getAuditLogs(),
      ]);
      setApprovals(apprs);
      setPolicies(pols);
      setAuditLogs(audits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load governance data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDecision = async (requestId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    await governanceApi.decideApproval(requestId, decision, reason);
    await refresh();
  };

  const handleSavePolicy = async (policy: Partial<PolicyDefinition>) => {
    const saved = await governanceApi.savePolicy(policy);
    setPolicies(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    return saved;
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    approvals,
    policies,
    auditLogs,
    loading,
    error,
    refresh,
    handleDecision,
    handleSavePolicy,
  };
}

// --- World Studio Hook ---
export function useWorldStudio() {
  const [entities, setEntities] = useState<WorldEntityNode[]>([]);
  const [relationships, setRelationships] = useState<WorldRelationshipEdge[]>([]);
  const [snapshots, setSnapshots] = useState<WorldSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await worldApi.getWorldTopology();
      setEntities(res.entities);
      setRelationships(res.relationships);
      setSnapshots(res.snapshots);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load world topology');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSimulation = async (fault: SimulationFaultInjection, monteCarlo: MonteCarloSweepConfig): Promise<SimulationImpactAnalysis> => {
    return await worldApi.runSimulation(fault, monteCarlo);
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entities, relationships, snapshots, loading, error, refresh, runSimulation };
}

// --- Automation Hook ---
export function useAutomation() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const wfs = await automationApi.getWorkflows();
      setWorkflows(wfs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerWorkflow = async (id: string) => {
    const res = await automationApi.triggerWorkflow(id);
    await refresh();
    return res;
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workflows, loading, error, refresh, triggerWorkflow };
}

// --- Capabilities Hook ---
export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<ConnectedCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const caps = await capabilitiesApi.getCapabilities();
      setCapabilities(caps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { capabilities, loading, error, refresh };
}

// --- Workspaces Hook ---
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const ws = await workspacesApi.getWorkspaces();
      setWorkspaces(ws);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workspaces, loading, error, refresh };
}

export function useWorkspaceDetail(id: string) {
  const [workspace, setWorkspace] = useState<(WorkspaceConfig & {
    environmentVariables: Record<string, string>;
    mountedDirectories: string[];
    securityProfile: { readOnlyRoot: boolean; networkEgressAllowList: string[] };
  }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const detail = await workspacesApi.getWorkspaceDetail(id);
      setWorkspace(detail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workspace, loading, error, refresh };
}

// --- System Hook ---
export function useSystem() {
  const [models, setModels] = useState<LLMModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderCredential[]>([]);
  const [settings, setSettings] = useState<{ org: TenantOrgSettings; users: UserRoleItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [m, p, s] = await Promise.all([
        systemApi.getModels(),
        systemApi.getProviders(),
        systemApi.getTenantSettings(),
      ]);
      setModels(m);
      setProviders(p);
      setSettings(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { models, providers, settings, loading, error, refresh };
}
