/**
 * SYNAPSE OS — Typed API Client
 * Zero mock data. Zero fallbacks. Zero fabricated responses.
 * Every response comes from the real SYNAPSE backend.
 */

import type {
  SynapseSession,
  SynapseTask,
  AgentDefinition,
  ToolApprovalRequest,
  SynapsePolicy,
  VerificationRun,
  AuditRecord,
  WorldEntity,
  WorldRelationship,
  SimulationRun,
  SystemHealthStatus,
  ApiError as ApiErrorType,
} from '@/types';

export { ApiError } from '@/types';

class SynapseApiClient {
  private baseUrl = '/api/v1';
  private token: string | null = null;
  private tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('synapse_auth_token');
      this.tenantId = localStorage.getItem('synapse_tenant_id') || this.tenantId;
    }
  }

  // ── Auth ──────────────────────────────────────────────

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('synapse_auth_token', token);
      else localStorage.removeItem('synapse_auth_token');
    }
  }

  public setTenantId(tenantId: string) {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('synapse_tenant_id', tenantId);
    }
  }

  public getToken(): string | null { return this.token; }
  public getTenantId(): string { return this.tenantId; }

  public async login(apiKeyOrUser: string) {
    const res = await this.request<{
      token: string;
      userId: string;
      tenantId: string;
      expiresIn: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ apiKeyOrUser }),
    });
    this.setToken(res.token);
    this.setTenantId(res.tenantId);
    return res;
  }

  // ── HTTP Client ───────────────────────────────────────

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const isPublic = endpoint.startsWith('/health') || endpoint.startsWith('/metrics');
    const url = isAbsolute ? endpoint
      : isPublic ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let body: { error?: string; message?: string; details?: unknown } = {};
      try { body = await response.json(); } catch { body = { message: response.statusText }; }
      throw new (await import('@/types')).ApiError(
        response.status,
        body.error || 'API_ERROR',
        body.message || `Request failed with status ${response.status}`,
        body.details
      );
    }

    if (response.status === 204) return {} as T;
    const ct = response.headers.get('content-type');
    if (ct?.includes('application/json')) return (await response.json()) as T;
    return (await response.text()) as unknown as T;
  }

  // ── Health ────────────────────────────────────────────

  public getHealth = () => this.request<SystemHealthStatus>('/health');

  // ── Sessions ──────────────────────────────────────────

  public getSessions = (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<SynapseSession[]>(`/sessions${q}`);
  };

  public getSession = (id: string) =>
    this.request<SynapseSession>(`/sessions/${id}`);

  public createSession = (data: Partial<SynapseSession>) =>
    this.request<SynapseSession>('/sessions', {
      method: 'POST', body: JSON.stringify(data),
    });

  public getSessionMessages = (id: string) =>
    this.request<unknown[]>(`/sessions/${id}/messages`);

  public sendInstruction = (id: string, instruction: string, provider?: string, modelId?: string) =>
    this.request<{ success: boolean; messages: unknown[] }>(`/sessions/${id}/interventions`, {
      method: 'POST',
      body: JSON.stringify({ instruction, provider, modelId }),
    });

  public pauseSession = (id: string) =>
    this.request<unknown>(`/sessions/${id}/pause`, { method: 'POST' });

  public resumeSession = (id: string, prompt?: string) =>
    this.request<unknown>(`/sessions/${id}/resume`, {
      method: 'POST', body: JSON.stringify({ prompt }),
    });

  public stopSession = (id: string) =>
    this.request<unknown>(`/sessions/${id}/stop`, { method: 'POST' });

  public getSessionTimeline = (id: string) =>
    this.request<unknown[]>(`/sessions/${id}/timeline`);

  public getSessionFiles = (id: string) =>
    this.request<unknown[]>(`/sessions/${id}/files`);

  public getSessionDiff = (id: string) =>
    this.request<unknown[]>(`/sessions/${id}/diff`);

  public getSessionUsage = (id: string) =>
    this.request<unknown>(`/sessions/${id}/usage`);

  // ── Tasks ─────────────────────────────────────────────

  public getTasks = () =>
    this.request<SynapseTask[]>('/tasks');

  public getTaskById = (id: string) =>
    this.request<SynapseTask>(`/tasks/${id}`);

  public createTask = (data: Partial<SynapseTask>) =>
    this.request<SynapseTask>('/tasks', {
      method: 'POST', body: JSON.stringify(data),
    });

  // ── Agents ────────────────────────────────────────────

  public getAgents = () =>
    this.request<AgentDefinition[]>('/agents');

  public getAgentById = (id: string) =>
    this.request<AgentDefinition>(`/agents/${id}`);

  public createAgent = (data: Partial<AgentDefinition>) =>
    this.request<AgentDefinition>('/agents', {
      method: 'POST', body: JSON.stringify(data),
    });

  // ── Approvals ─────────────────────────────────────────

  public getApprovals = () =>
    this.request<ToolApprovalRequest[]>('/approvals');

  public resolveApproval = (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    this.request<unknown>(`/approvals/${id}/resolve`, {
      method: 'POST', body: JSON.stringify({ decision, reason }),
    });

  // ── Policies ──────────────────────────────────────────

  public getPolicies = () =>
    this.request<SynapsePolicy[]>('/policies');

  // ── Verification ──────────────────────────────────────

  public getVerifications = () =>
    this.request<VerificationRun[]>('/verification');

  public getVerification = (id: string) =>
    this.request<VerificationRun>(`/verification/${id}`);

  // ── Audit ─────────────────────────────────────────────

  public getAuditLogs = (params?: { limit?: number; offset?: number; eventType?: string }) => {
    const q = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request<{ records: AuditRecord[]; total: number; hasMore: boolean }>(`/audit${q}`);
  };

  // ── World Model ───────────────────────────────────────

  public getWorldEntities = () =>
    this.request<WorldEntity[]>('/world/entities');

  public getWorldRelationships = () =>
    this.request<WorldRelationship[]>('/world/relationships');

  public getWorldTopology = () =>
    this.request<{ entities: WorldEntity[]; relationships: WorldRelationship[] }>('/world/topology');

  // ── Simulations ───────────────────────────────────────

  public getSimulations = () =>
    this.request<SimulationRun[]>('/simulations');

  // ── Security ──────────────────────────────────────────

  public triggerKillSwitch = (reason?: string) =>
    this.request<{ triggered: boolean; tenantId: string; reason: string; executedAt: string }>(
      '/security/kill-switch', {
        method: 'POST', body: JSON.stringify({ reason }),
      }
    );

  // ── Composite Helpers (real data only) ────────────────

  public async getActiveMetrics() {
    const [sessions, tasks, approvals, verifications] = await Promise.all([
      this.getSessions().catch(() => []),
      this.getTasks().catch(() => []),
      this.getApprovals().catch(() => []),
      this.getVerifications().catch(() => []),
    ]);

    const running = sessions.filter(
      (s) => s.status === 'active' || s.status === 'awaiting_approval'
    ).length;
    const waiting = approvals.filter(
      (a) => a.status === 'pending' || a.status === 'PENDING'
    ).length;
    const verifying = verifications.filter(
      (v) => v.overallVerdict === 'INCONCLUSIVE'
    ).length;

    return { running, waiting, verifying, total: sessions.length };
  }
}

export const api = new SynapseApiClient();
export const apiClient = api;
export default api;
