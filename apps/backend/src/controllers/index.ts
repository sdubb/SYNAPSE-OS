import { AuditEngine } from '@synapse/audit-engine';
import { EventBus } from '@synapse/event-bus';
import { Scheduler } from '@synapse/scheduler';
import { ConnectorManager } from '@synapse/connector-manager';
import { AgentAdapterRegistry } from '@synapse/external-agents';
import { healthSignals, metrics, costTelemetry, logger } from '@synapse/observability';
import {
  DatabaseClient,
  SessionRepository,
  AgentRepository,
  TaskRepository,
  ApprovalRepository,
  PolicyRepository,
  VerificationRepository,
  TenantRepository,
  WorldRepository,
  SimulationRepository,
  ProviderRepository,
} from '@synapse/database';

export interface ServiceContainer {
  auditEngine: AuditEngine;
  eventBus: EventBus;
  scheduler: Scheduler;
  connectorManager: ConnectorManager;
  externalAgents: AgentAdapterRegistry;
}

export interface RepositoryContainer {
  tenants: TenantRepository;
  agents: AgentRepository;
  sessions: SessionRepository;
  tasks: TaskRepository;
  approvals: ApprovalRepository;
  policies: PolicyRepository;
  verifications: VerificationRepository;
  world: WorldRepository;
  simulations: SimulationRepository;
  providers: ProviderRepository;
}

import { JwtService } from '@synapse/security';
import { ClineEngine, ClineStorageAdapter } from '@synapse/engine-adapter';
import { config } from '../config.js';

const jwtService = new JwtService({ secret: config.JWT_SECRET });

export class AppController {
  public readonly services: ServiceContainer;
  public readonly repos: RepositoryContainer;
  public readonly clineEngine: ClineEngine;
  public readonly clineStorage: ClineStorageAdapter;
  private readonly dbClient: DatabaseClient;

  constructor(services?: Partial<ServiceContainer>) {
    const auditEngine = services?.auditEngine ?? new AuditEngine();
    const eventBus = services?.eventBus ?? new EventBus();
    const scheduler = services?.scheduler ?? new Scheduler();
    const connectorManager = services?.connectorManager ?? new ConnectorManager();
    const externalAgents = services?.externalAgents ?? new AgentAdapterRegistry();

    this.services = { auditEngine, eventBus, scheduler, connectorManager, externalAgents };
    this.clineEngine = new ClineEngine({
      clientName: 'synapse-os',
      defaultWorkspaceDirectory: process.cwd(),
    });
    this.clineStorage = new ClineStorageAdapter();

    // Initialize database client singleton
    this.dbClient = DatabaseClient.getInstance();

    // Repositories will be set up after connect() — use a lazy proxy pattern
    // so routes can import appController at module load time safely.
    const lazyDb = () => this.dbClient.getDb();

    this.repos = {
      tenants: new TenantRepository(lazyDb as any),
      agents: new AgentRepository(lazyDb as any),
      sessions: new SessionRepository(lazyDb as any),
      tasks: new TaskRepository(lazyDb as any),
      approvals: new ApprovalRepository(lazyDb as any),
      policies: new PolicyRepository(lazyDb as any),
      verifications: new VerificationRepository(lazyDb as any),
      world: new WorldRepository(lazyDb as any),
      simulations: new SimulationRepository(lazyDb as any),
      providers: new ProviderRepository(lazyDb as any),
    };
  }

  /**
   * Initialize the ClineEngine. Should be called during bootstrap.
   * Logs the result and throws on failure so the server doesn't start in a broken state.
   */
  public async initializeEngine(): Promise<void> {
    try {
      await this.clineEngine.initialize();
      const health = this.clineEngine.getHealth();
      logger.info(`[AppController] ClineEngine initialized — status: ${health.status}, runtime: ${health.runtimeAddress ?? 'local'}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[AppController] ClineEngine initialization FAILED: ${message}`);
      // Re-throw so bootstrap can decide whether to exit or continue degraded
      throw err;
    }
  }

  /**
   * Connect to PostgreSQL. Must be called during bootstrap before handling requests.
   */
  public async connectDatabase(): Promise<void> {
    const db = await this.dbClient.connect();
    logger.info('[AppController] PostgreSQL connected via Drizzle ORM.');

    // Re-inject live db instance into all repositories
    (this.repos.tenants as any).db = db;
    (this.repos.agents as any).db = db;
    (this.repos.sessions as any).db = db;
    (this.repos.tasks as any).db = db;
    (this.repos.approvals as any).db = db;
    (this.repos.policies as any).db = db;
    (this.repos.verifications as any).db = db;
    (this.repos.world as any).db = db;
    (this.repos.simulations as any).db = db;
    (this.repos.providers as any).db = db;

    // Seed default models for the default tenant
    const tid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    this.repos.providers.seedDefaults(tid).catch(() => {});

    // Seed default models for the tenant
    this.repos.providers.seedDefaults(tid).catch(() => {});
    (this.repos.providers as any).db = db;
  }

  // --- Auth ---
  public async login(_apiKeyOrUser: string, tenantId?: string) {
    const tid = tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const token = jwtService.sign({
      userId: 'usr_admin_01',
      tenantId: tid,
      email: 'admin@synapse.os',
      role: 'admin' as any,
      permissions: ['*'] as any,
    });
    return {
      token,
      userId: 'usr_admin_01',
      tenantId: tid,
      expiresIn: 86400,
    };
  }

  // --- Tenants ---
  public async getTenants() {
    return this.repos.tenants.list({ limit: 100 });
  }

  public async getTenantById(id: string) {
    return this.repos.tenants.findById(id);
  }

  public async createTenant(data: Record<string, unknown>) {
    return this.repos.tenants.create({
      id: (data.id as string) || crypto.randomUUID(),
      name: (data.name as string) ?? 'New Tenant',
      slug: (data.slug as string) ?? `tenant-${Date.now()}`,
      plan: (data.plan as any) ?? 'STARTER',
      isActive: true,
    } as any);
  }

  // --- Agents ---
  public async getAgents(tenantId: string) {
    return this.repos.agents.list({ tenantId });
  }

  public async getAgentById(tenantId: string, id: string) {
    return this.repos.agents.findById(id, tenantId);
  }

  public async createAgent(tenantId: string, data: Record<string, unknown>) {
    return this.repos.agents.create({
      id: (data.id as string) || crypto.randomUUID(),
      name: (data.name as string) ?? 'Agent',
      role: (data.role as string) ?? 'general',
      // `model` is a jsonb column — accept an object or build a minimal default
      model: (data.model as object) ?? { provider: 'anthropic', id: (data.modelId as string) ?? 'claude-3-5-sonnet' },
      isActive: true,
      ...data,
      tenantId,
    } as any);
  }

  public async updateAgent(tenantId: string, id: string, data: Record<string, unknown>) {
    return this.repos.agents.update(id, data as any, tenantId);
  }

  public async deleteAgent(tenantId: string, id: string) {
    return this.repos.agents.delete(id, tenantId);
  }

  // --- Sessions ---
  public async getSessions(tenantId: string, filters?: { agentId?: string; status?: string }) {
    return this.repos.sessions.list({ tenantId, ...filters });
  }

  public async getSessionById(tenantId: string, id: string) {
    return this.repos.sessions.findById(id, tenantId);
  }

  public async createSession(tenantId: string, data: Record<string, unknown>) {
    const sessionId = (data.id as string) || crypto.randomUUID();

    let agentId = data.agentId as string | undefined;
    if (!agentId) {
      const existingAgents = await this.repos.agents.list({ tenantId });
      if (existingAgents && existingAgents.length > 0) {
        agentId = existingAgents[0].id;
      } else {
        const defaultAgent = await this.repos.agents.create({
          tenantId,
          name: 'Autonomous Specialist Agent',
          description: 'Primary autonomous coding and systems specialist agent.',
          model: 'openrouter/nvidia/nemotron-3.5-lightning:free',
          systemPrompt: 'You are an autonomous engineering assistant.',
          enableSpawnAgent: true,
          maxSubagents: 4,
          status: 'idle',
        } as any);
        agentId = defaultAgent.id;
      }
    }

    return this.repos.sessions.create({
      id: sessionId,
      agentId,
      workspaceId: (data.workspaceId as string) ?? crypto.randomUUID(),
      clineSessionId: (data.clineSessionId as string) ?? sessionId,
      runtimeId: (data.runtimeId as string) ?? crypto.randomUUID(),
      runtimeMetadata: (data.runtimeMetadata as object) ?? {},
      status: 'active',
      ...data,
      tenantId,
    } as any);
  }

  public async updateSessionStatus(tenantId: string, id: string, status: string) {
    return this.repos.sessions.updateStatus(id, status, tenantId);
  }

  public async updateSession(tenantId: string, id: string, data: Record<string, unknown>) {
    return this.repos.sessions.update(id, data as any, tenantId);
  }

  public async getSessionMessages(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;

    // Try to read from Cline native storage first
    const clineSessionId = (session as any).clineSessionId || id;
    const clineMessages = await this.clineStorage.getFormattedMessages(clineSessionId);
    if (clineMessages.length > 0) {
      return clineMessages;
    }

    // Fallback to DB metadata messages
    return (session.metadata as any)?.messages || [];
  }

  public async sendMessage(tenantId: string, id: string, message: string, provider?: string, modelId?: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;

    // Resolve provider/model — use selected values or fall back to defaults
    const resolvedProvider = provider || 'openrouter';
    const resolvedModel = modelId || 'nvidia/nemotron-3.5-lightning:free';

    // Look up the API key for this provider from the tenant's provider_keys table
    let apiKey = '';
    try {
      const providerKeys = await this.repos.providers.listKeys({ tenantId, provider: resolvedProvider });
      if (providerKeys.length > 0 && providerKeys[0].encryptedApiKey) {
        apiKey = Buffer.from(providerKeys[0].encryptedApiKey, 'base64').toString('utf-8');
      }
    } catch {
      // No key stored for this provider
    }

    if (!apiKey) {
      logger.warn(`[AppController] No API key found for provider '${resolvedProvider}' in tenant '${tenantId}'. Add a provider key via POST /api/v1/providers`);
    }

    logger.info(`[AppController] sendMessage provider=${resolvedProvider} model=${resolvedModel} hasKey=${!!apiKey} for session ${id}`);

    // 1. Dispatch to ClineEngine — await real execution
    let clineSessionId: string;
    try {
      const active = this.clineEngine.getSession(id);
      if (!active) {
        // Start a new Cline session with this prompt
        const { session: clineSession, startResult } = await this.clineEngine.startSession({
          synapseSessionId: id,
          tenantId,
          agentId: session.agentId,
          taskId: session.taskId || undefined,
          workspaceId: session.workspaceId,
          prompt: message,
          cwd: process.cwd(),
          modelConfig: {
            provider: resolvedProvider,
            modelId: resolvedModel,
            apiKey,
          },
        });
        clineSessionId = startResult.sessionId;

        // Wait for Cline to finish processing
        await clineSession.waitForCompletion(120_000);
      } else {
        clineSessionId = active.clineSessionId;
        // Send follow-up to existing session
        await this.clineEngine.sendMessage(id, message);
        await this.clineEngine.waitForSessionCompletion(id, 120_000);
      }
    } catch (err: any) {
      logger.error(`[AppController] Cline execution failed for session ${id}:`, err?.message || err);
      clineSessionId = id;
    }

    // 2. Read REAL messages from Cline native storage (~/.cline/data/)
    const formattedMessages = await this.clineStorage.getFormattedMessages(clineSessionId);

    // 3. Also persist to DB metadata for fast access
    const currentMetadata = (session.metadata as any) || {};
    await this.repos.sessions.update(
      id,
      {
        metadata: { ...currentMetadata, clineSessionId, messages: formattedMessages },
        status: 'active',
      } as any,
      tenantId
    );

    // 4. Publish latest message to EventBus for WebSocket subscribers
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg) {
      this.services.eventBus.publish({
        eventType: 'session.message',
        tenantId,
        sessionId: id,
        source: 'backend',
        payload: { message: lastMsg },
      });
    }

    return {
      success: true,
      sessionId: id,
      message,
      messages: formattedMessages,
    };
  }

  public async getSessionUsage(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    const active = this.clineEngine.getSession(id);
    if (active) {
      return active.getTokenUsage();
    }
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: (session as any).totalTokens || 0,
      estimatedCostUsd: Number((session as any).totalCostUsd || 0),
    };
  }

  public async pauseSession(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    try {
      await this.clineEngine.pauseSession(id);
    } catch {}
    return this.repos.sessions.updateStatus(id, 'paused', tenantId);
  }

  public async resumeSession(tenantId: string, id: string, prompt?: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    try {
      await this.clineEngine.resumeSession(id, prompt);
    } catch {}
    return this.repos.sessions.updateStatus(id, 'active', tenantId);
  }

  public async stopSession(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    try {
      await this.clineEngine.stopSession(id);
    } catch {}
    return this.repos.sessions.updateStatus(id, 'cancelled', tenantId);
  }

  public async getSessionTimeline(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    return [
      {
        id: `tl_${id}_1`,
        sessionId: id,
        type: 'STATUS_CHANGE',
        title: 'Session Initialized',
        description: `Session started for agent ${session.agentId}`,
        timestamp: session.startedAt || session.createdAt,
        status: 'COMPLETED',
      },
    ];
  }

  public async getSessionFiles(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    return [
      { name: 'src', type: 'directory', path: 'src', children: [] },
      { name: 'package.json', type: 'file', path: 'package.json', size: 1024 },
    ];
  }

  public async getSessionDiff(tenantId: string, id: string) {
    const session = await this.getSessionById(tenantId, id);
    if (!session) return null;
    return [];
  }

  // --- Tasks ---
  public async getTasks(tenantId: string, filters?: { status?: string; assignedAgentId?: string }) {
    return this.repos.tasks.list({ tenantId, ...filters });
  }

  public async getTaskById(tenantId: string, id: string) {
    return this.repos.tasks.findById(id, tenantId);
  }

  public async createTask(tenantId: string, data: Record<string, unknown>) {
    return this.repos.tasks.create({
      id: (data.id as string) || crypto.randomUUID(),
      workspaceId: (data.workspaceId as string) || crypto.randomUUID(),
      title: (data.title as string) ?? 'New Task',
      status: 'queued',
      priority: (data.priority as any) ?? 'medium',
      ...data,
      tenantId,
    } as any);
  }

  public async updateTask(tenantId: string, id: string, data: Record<string, unknown>) {
    return this.repos.tasks.update(id, data as any, tenantId);
  }

  public async updateTaskStatus(tenantId: string, id: string, status: string, result?: unknown) {
    return this.repos.tasks.updateStatus(id, status, result, tenantId);
  }

  public async deleteTask(tenantId: string, id: string) {
    return this.repos.tasks.delete(id, tenantId);
  }

  // --- Approvals ---
  public async getApprovals(tenantId: string, filters?: { sessionId?: string; status?: string }) {
    return this.repos.approvals.list({ tenantId, ...filters });
  }

  public async getApprovalById(tenantId: string, id: string) {
    return this.repos.approvals.findById(id, tenantId);
  }

  public async createApproval(tenantId: string, data: Record<string, unknown>) {
    const sessId = (data.sessionId as string) || crypto.randomUUID();
    return this.repos.approvals.create({
      id: (data.id as string) || crypto.randomUUID(),
      sessionId: sessId,
      clineSessionId: (data.clineSessionId as string) || sessId,
      agentId: (data.agentId as string) || crypto.randomUUID(),
      callId: (data.callId as string) || `call_${Date.now()}`,
      toolName: (data.toolName as string) ?? 'unknown',
      toolParameters: (data.toolParameters as any) ?? {},
      riskLevel: (data.riskLevel as any) ?? 'medium',
      status: 'pending',
      timeoutSeconds: (data.timeoutSeconds as number) ?? 300,
      expiresAt: new Date(Date.now() + 300_000),
      ...data,
      tenantId,
    } as any);
  }

  public async resolveApproval(
    tenantId: string,
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
    decidedByUserId?: string
  ) {
    return this.repos.approvals.resolveDecision(
      id,
      { decision, decidedByUserId, decisionReason: reason },
      tenantId
    );
  }

  // --- Policies ---
  public async getPolicies(tenantId: string, filters?: { scope?: string; enabledOnly?: boolean }) {
    return this.repos.policies.list({ tenantId, ...filters });
  }

  public async getPolicyById(tenantId: string, id: string) {
    return this.repos.policies.findById(id, tenantId);
  }

  public async createPolicy(tenantId: string, data: Record<string, unknown>) {
    return this.repos.policies.create({
      id: (data.id as string) || crypto.randomUUID(),
      name: (data.name as string) ?? 'New Policy',
      scope: (data.scope as any) ?? 'tenant',
      rules: (data.rules as any) ?? [],
      enabled: true,
      ...data,
      tenantId,
    } as any);
  }

  public async updatePolicy(tenantId: string, id: string, data: Record<string, unknown>) {
    return this.repos.policies.update(id, data as any, tenantId);
  }

  public async deletePolicy(tenantId: string, id: string) {
    return this.repos.policies.delete(id, tenantId);
  }

  // --- Verification ---
  public async getVerifications(tenantId: string) {
    return this.repos.verifications.list({ tenantId });
  }

  public async getVerificationById(tenantId: string, id: string) {
    return this.repos.verifications.findById(id, tenantId);
  }

  public async getVerificationBySessionId(tenantId: string, sessionId: string) {
    return this.repos.verifications.findBySessionId(sessionId, tenantId);
  }

  public async createVerification(tenantId: string, data: Record<string, unknown>) {
    return this.repos.verifications.create({
      id: (data.id as string) || crypto.randomUUID(),
      sessionId: (data.sessionId as string) ?? undefined,
      agentId: (data.agentId as string) ?? undefined,
      verdict: (data.verdict as string) ?? 'PENDING',
      ...data,
      tenantId,
    } as any);
  }

  // --- World Model ---
  public async getWorldEntities(tenantId: string) {
    return this.repos.world.listEntities({ tenantId });
  }

  public async createWorldEntity(tenantId: string, data: Record<string, unknown>) {
    return this.repos.world.createEntity({
      id: (data.id as string) || crypto.randomUUID(),
      name: (data.name as string) ?? 'Entity',
      type: (data.type as string) ?? 'service',
      // worldModelId is required — callers should provide it; fall back to a placeholder
      worldModelId: (data.worldModelId as string) ?? crypto.randomUUID(),
      ...data,
      tenantId,
    } as any);
  }

  public async getWorldRelationships(tenantId: string) {
    return this.repos.world.listRelationships({ tenantId });
  }

  // --- Simulations ---
  public async getSimulations(tenantId: string) {
    return this.repos.simulations.list({ tenantId });
  }

  public async getSimulationById(tenantId: string, id: string) {
    return this.repos.simulations.findById(id, tenantId);
  }

  public async createSimulation(tenantId: string, data: Record<string, unknown>) {
    return this.repos.simulations.create({
      id: (data.id as string) || crypto.randomUUID(),
      name: (data.name as string) ?? 'Simulation',
      status: 'RUNNING',
      ...data,
      tenantId,
    } as any);
  }

  // --- Health & Observability ---
  public async getHealth() {
    const dbHealth = await this.dbClient.healthCheck();
    const appHealth = await healthSignals.getHealth();
    const engineHealth = this.clineEngine.getHealth();

    // Overall status is degraded if any critical component is unhealthy
    let overallStatus = appHealth.status as string;
    if (dbHealth.ok === false || engineHealth.status === 'FAILED') {
      overallStatus = 'DEGRADED';
    }
    if (!dbHealth.ok && engineHealth.status !== 'HEALTHY') {
      overallStatus = 'UNHEALTHY';
    }

    return {
      ...appHealth,
      status: overallStatus,
      database: dbHealth,
      engine: engineHealth,
    };
  }

  public getMetricsPrometheus() {
    return metrics.toPrometheusFormat();
  }

  public getCostSummary(tenantId: string) {
    return costTelemetry.getSummaryForTenant(tenantId);
  }

  // --- Provider Keys ---
  public async getProviderKeys(tenantId: string) {
    return this.repos.providers.listKeys({ tenantId });
  }

  public async getProviderKeyById(tenantId: string, id: string) {
    return this.repos.providers.findKeyById(id, tenantId);
  }

  public async createProviderKey(tenantId: string, data: Record<string, unknown>) {
    const rawKey = (data.apiKey as string) || '';
    const encryptedKey = Buffer.from(rawKey).toString('base64');
    return this.repos.providers.createKey({
      provider: (data.provider as string) || 'custom',
      displayName: (data.displayName as string) || 'Custom Provider',
      encryptedApiKey: encryptedKey,
      endpointUrl: (data.endpointUrl as string) || null,
      status: 'ACTIVE',
      lastValidatedAt: new Date(),
      metadata: (data.metadata as object) || {},
      ...data,
      tenantId,
    } as any);
  }

  public async deleteProviderKey(tenantId: string, id: string) {
    return this.repos.providers.deleteKey(id, tenantId);
  }

  public async validateProviderKey(tenantId: string, id: string) {
    return this.repos.providers.validateKey(id, tenantId);
  }

  public async rotateProviderKey(tenantId: string, id: string, newApiKey: string) {
    const encryptedKey = Buffer.from(newApiKey).toString('base64');
    return this.repos.providers.rotateKey(id, encryptedKey, tenantId);
  }

  // --- LLM Models ---
  public async getModels(tenantId: string) {
    return this.repos.providers.listModels({ tenantId });
  }

  public async getModelById(tenantId: string, id: string) {
    return this.repos.providers.findModelById(id, tenantId);
  }

  public async createModel(tenantId: string, data: Record<string, unknown>) {
    return this.repos.providers.createModel({
      modelId: (data.modelId as string) || `model_${Date.now()}`,
      provider: (data.provider as string) || 'custom',
      displayName: (data.displayName as string) || 'Custom Model',
      contextWindow: String(data.contextWindow || '128000'),
      inputPricingPer1M: String(data.inputPricingPer1M || '0'),
      outputPricingPer1M: String(data.outputPricingPer1M || '0'),
      rateLimitRpm: String(data.rateLimitRpm || '1000'),
      rateLimitTpm: String(data.rateLimitTpm || '100000'),
      availability: (data.availability as string) || 'AVAILABLE',
      enabled: data.enabled !== false,
      capabilities: (data.capabilities as string[]) || [],
      ...data,
      tenantId,
    } as any);
  }

  public async updateModel(tenantId: string, id: string, data: Record<string, unknown>) {
    return this.repos.providers.updateModel(id, data as any, tenantId);
  }

  public async deleteModel(tenantId: string, id: string) {
    return this.repos.providers.deleteModel(id, tenantId);
  }

  /**
   * Gracefully disconnect the database pool.
   */
  public async disconnectDatabase(): Promise<void> {
    await this.dbClient.close();
    logger.info('[AppController] PostgreSQL connection pool closed.');
  }
}

export const appController = new AppController();
