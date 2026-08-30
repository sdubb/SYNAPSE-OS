import crypto from "node:crypto";
import * as path from "node:path";
import { ClineCore, type ClineCoreOptions } from "@cline/core";
import type { StartSessionResult } from "@cline/core";
import { ToolGateway, globalToolGateway } from "@synapse/tool-gateway";
import { ClineSession } from "./ClineSession.js";
import { ClineWorkspace } from "./ClineWorkspace.js";
import { ClineTeam, type CreateTeamOptions } from "./ClineTeam.js";
import { executeStart, executePause, executeResume, executeAbort, executeStop, executeRestart } from "./lifecycle/index.js";
import { ClineSessionNotFoundError, ClineExecutionError, ClineCheckpointError } from "./errors/ClineEngineError.js";
import { SynapseMcpBridge, type McpToolContext } from "./mcp/SynapseMcpBridge.js";
import type { SynapseEventEnvelope } from "@synapse/contracts";
import type { SessionCompletionResult } from "./ClineSession.js";
import { getGraphTools } from "./graph/GraphTools.js";
import { ExecutionGraphEngine } from "@synapse/control-plane";

export interface SessionMetadata {
  tenantId: string;
  agentId: string;
  missionId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  workspaceId?: string;
  workspaceRoot?: string;
  runtimeId?: string;
}

export interface SessionMetadataResolver {
  resolveSession(sessionId: string): Promise<SessionMetadata | null>;
}

export interface ClineEngineOptions {
  clientName?: string;
  defaultWorkspaceDirectory?: string;
  coreOptions?: ClineCoreOptions;
  toolGateway?: ToolGateway;
  sessionResolver?: SessionMetadataResolver;
}

export interface StartEngineSessionOptions {
  synapseSessionId?: string;
  tenantId: string;
  agentId: string;
  missionId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  workspaceId: string;
  workspacePath?: string;
  runtimeId?: string;
  prompt: string;
  cwd: string;
  modelConfig?: {
    provider?: string;
    modelId?: string;
    apiKey?: string;
    inputPricePer1M?: number;
    outputPricePer1M?: number;
  };
  systemPrompt?: string;
  customInstructions?: string;
  graphEngine?: ExecutionGraphEngine;
  simEngine?: any;
  getTwinFn?: (env: string) => any;
  workforceEngine?: any; // WorkforceGraphEngine
}

export interface ClineEngineHealthStatus {
  readonly status: "HEALTHY" | "DEGRADED" | "UNINITIALIZED" | "FAILED";
  readonly isInitialized: boolean;
  readonly activeSessionCount: number;
  readonly activeWorkspaceCount: number;
  readonly runtimeAddress: string | undefined;
  readonly lastError: string | undefined;
  readonly initializedAt: Date | undefined;
}

import { createDefaultExecutors, type ToolExecutors } from "@cline/core";

export class ClineEngine {
  private cline: ClineCore | null = null;
  private readonly activeSessions = new Map<string, ClineSession>();
  private readonly activeWorkspaces = new Map<string, ClineWorkspace>();
  private teamRuntime: ClineTeam | null = null;
  private isInitialized = false;
  private initError: string | undefined;
  private initializedAt: Date | undefined;
  public readonly toolGateway: ToolGateway;
  public graphEngine?: ExecutionGraphEngine;
  public simEngine?: any;
  public getTwinFn?: (env: string) => any;
  public workforceEngine?: any;
  public mcpBridge?: SynapseMcpBridge;
  
  // Cache to store authorization context between requestToolApproval and actual execution
  private readonly pendingToolCalls = new Map<string, {
    token: any;
    context: any;
  }>();

  constructor(private readonly options: ClineEngineOptions = {}) {
    this.toolGateway = options.toolGateway ?? globalToolGateway;
  }

  private createGovernedExecutors(): Partial<ToolExecutors> {
    const defaultExecutors = createDefaultExecutors();
    const governed: Partial<ToolExecutors> = {};

    for (const [toolName, originalExecutor] of Object.entries(defaultExecutors)) {
      governed[toolName as keyof ToolExecutors] = async (...args: any[]) => {
        const agentContext = args[args.length - 1]; // AgentToolContext is always the last argument
        const callId = agentContext.toolCallId;
        
        if (!callId) {
          throw new Error(`Execution blocked: Missing toolCallId in AgentToolContext for tool '${toolName}'`);
        }

        const pending = this.pendingToolCalls.get(callId);
        if (!pending) {
          throw new Error(`Execution blocked: No authorization context found for call '${callId}'. ToolGateway must authorize first.`);
        }

        // Remove from cache to prevent replay
        this.pendingToolCalls.delete(callId);

        // Execute authoritatively through Synapse-OS ToolGateway
        const result = await this.toolGateway.executeTool(
          pending.context,
          async () => await (originalExecutor as any)(...args),
          pending.token
        );

        if (this.graphEngine) {
          const obsData = !result.success
            ? { success: false, error: result.error }
            : (typeof result.output === "object" && result.output !== null
              ? (result.output as Record<string, any>)
              : { result: result.output, success: result.success });

          this.graphEngine.recordObservation({
            source: "TOOL_EXECUTION",
            toolName,
            callId,
            runId: pending.context.runId,
            attemptId: pending.context.attemptId,
            evidenceId: result.evidenceId,
            auditEventId: result.auditEventId,
            timestamp: new Date().toISOString(),
          }, obsData);
        }

        if (!result.success) {
          throw new Error(`ToolGateway Execution Failed: ${result.error}`);
        }

        if (toolName === "team_spawn_teammate" && this.workforceEngine) {
          const spawnedAgentId = (result.output as any)?.agentId || `spawned-${crypto.randomUUID()}`;
          this.workforceEngine.registerSpawn({
            agentId: spawnedAgentId,
            parentAgentId: pending.context.agentId,
            teamId: pending.context.teamId || "default-team",
            missionId: pending.context.missionId || "unknown",
            taskId: pending.context.taskId,
            runId: pending.context.runId,
            attemptId: pending.context.attemptId,
            runtimeId: pending.context.runtimeId,
            clineSessionId: pending.context.sessionId
          });
        }
        
        if (toolName === "team_terminate_teammate" && this.workforceEngine) {
           const targetAgentId = args[0]?.agentId || (result.output as any)?.agentId;
           if (targetAgentId) {
             this.workforceEngine.registerTermination(targetAgentId);
           }
        }

        return result.output as any;
      };
    }

    return governed;
  }

  /**
   * Initialize native ClineCore instance and wire authoritative Synapse Tool Gateway.
   *
   * CRITICAL ARCHITECTURE (CR1): The requestToolApproval callback is the AUTHORITATIVE
   * execution boundary. Synapse evaluates the tool call through the full governance
   * pipeline AND captures an AuthorizationToken. When Cline receives `approved: true`,
   * Synapse has already issued and recorded a cryptographically-bound authorization.
   *
   * The authorization token ensures:
   * - Arguments cannot be mutated after authorization (hash binding)
   * - The authorization cannot be replayed for a different call
   * - Evidence and audit are captured for the authorization decision
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.cline) {
      return;
    }

    try {
      this.cline = await ClineCore.create({
        clientName: this.options.clientName || "synapse-os",
        backendMode: "local",
        capabilities: {
          // Authoritative tool execution interception layer
          requestToolApproval: async (request: any) => {
            return await this.handleClineToolApproval(request);
          },
          toolExecutors: this.createGovernedExecutors(),
        },
        ...this.options.coreOptions,
      });

      this.teamRuntime = new ClineTeam(this.cline);
      this.isInitialized = true;
      this.initError = undefined;
      this.initializedAt = new Date();

      // Initialize MCP bridge — exposes governed capabilities through Cline's native MCP pathway
      this.mcpBridge = new SynapseMcpBridge({
        toolGateway: this.toolGateway,
        auditEngine: this.toolGateway.auditEngine,
        eventBus: this.toolGateway.eventBus,
        graphEngine: this.graphEngine,
        defaultWorkspaceRoot: this.options.defaultWorkspaceDirectory,
      });
    } catch (err: unknown) {
      this.initError = err instanceof Error ? err.message : String(err);
      this.isInitialized = false;
      throw err;
    }
  }

  /**
   * Intercepts tool requests originating from Cline execution substrate and delegates
   * to Synapse ToolGateway (Kill Switch → Safety → Workspace → Policy → Capability → Approval → Allow).
   *
   * CR3: Missing tenant/agent context produces BLOCK — no synthetic identity fallback.
   * CR2: Authorization decision is cryptographically bound to exact call parameters.
   */
  private async handleClineToolApproval(
    request: any
  ): Promise<{ approved: boolean; reason?: string; modifiedParameters?: Record<string, unknown> }> {
    const sessionId = request.sessionId || request.conversationId;
    const session = sessionId ? this.getSession(sessionId) : undefined;

    const toolName = request.toolName || request.name || "unknown";
    const toolParameters = (request.toolParameters || request.input || request.arguments || {}) as Record<string, unknown>;
    const callId = request.callId || request.toolCallId || crypto.randomUUID();

    // CR9: Session Map is Cache Only.
    // If the session is missing from in-memory cache, fall back to authoritative resolver.
    let tenantId = session?.tenantId;
    let agentId = session?.agentId || request.agentId;
    let missionId = session?.missionId;
    let taskId = session?.taskId;
    let runId = session?.runId;
    let attemptId = session?.attemptId;
    let workspaceId = session?.workspaceId;
    let workspaceRoot = session?.workspacePath || this.options.defaultWorkspaceDirectory || "";
    let runtimeId = session?.runtimeId;

    if (!tenantId && sessionId && this.options.sessionResolver) {
      const resolved = await this.options.sessionResolver.resolveSession(sessionId);
      if (resolved) {
        tenantId = resolved.tenantId;
        agentId = resolved.agentId;
        missionId = resolved.missionId;
        taskId = resolved.taskId;
        runId = resolved.runId;
        attemptId = resolved.attemptId;
        workspaceId = resolved.workspaceId;
        workspaceRoot = resolved.workspaceRoot || workspaceRoot;
        runtimeId = resolved.runtimeId;
      }
    }

    // CR3: BLOCK if tenant/agent context cannot be resolved from session.
    // NEVER fall back to synthetic default tenant or general-agent.
    if (!tenantId) {
      // Emit audit event for missing identity
      this.toolGateway.eventBus.publish({
        eventType: "tool.blocked",
        tenantId: "UNKNOWN",
        agentId: agentId || "UNKNOWN",
        sessionId: sessionId || "UNKNOWN",
        source: "tool.gateway",
        payload: {
          toolName,
          callId,
          reason: "BLOCKED: Missing tenant identity — no synthetic fallback permitted (CR3)",
        },
      });

      void this.toolGateway.auditEngine.logSecurityEvent({
        tenantId: "SYSTEM",
        actor: { id: agentId || "UNKNOWN", type: "AGENT", tenantId: "SYSTEM" },
        eventType: "tool.identity_missing",
        severity: "CRITICAL",
        targetId: toolName,
        targetType: "TOOL",
        details: {
          callId,
          reason: "Tool request blocked due to missing tenant identity. No synthetic default-tenant fallback.",
          sessionId,
        },
      });

      return {
        approved: false,
        reason: "BLOCKED: Cannot resolve tenant identity for this tool request. No synthetic identity fallback permitted.",
      };
    }

    if (!agentId) {
      void this.toolGateway.auditEngine.logSecurityEvent({
        tenantId,
        actor: { id: "UNKNOWN", type: "AGENT", tenantId },
        eventType: "tool.identity_missing",
        severity: "CRITICAL",
        targetId: toolName,
        targetType: "TOOL",
        details: {
          callId,
          reason: "Tool request blocked due to missing agent identity.",
          sessionId,
        },
      });

      return {
        approved: false,
        reason: "BLOCKED: Cannot resolve agent identity for this tool request. No synthetic identity fallback permitted.",
      };
    }

    const contextForExecution = {
      tenantId,
      agentId,
      sessionId,
      callId,
      workspaceRoot,
      toolName,
      toolArguments: toolParameters,
      missionId,
      taskId,
      runId,
      attemptId,
      workspaceId,
      runtimeId,
    };

    const authResult = await this.toolGateway.evaluateAndAuthorizeToolCall({
      ...contextForExecution,
      sessionId: session?.synapseSessionId || sessionId || crypto.randomUUID(),
      clineSessionId: request.sessionId || sessionId,
      workspaceRoot: workspaceRoot || process.cwd(),
    });

    if (!authResult.authorized) {
      return {
        approved: false,
        reason: authResult.reason || "Action blocked by Synapse Governance",
      };
    }

    if (authResult.authorized && authResult.authorizationToken) {
      // Store token and context for the executor wrapper to consume
      this.pendingToolCalls.set(callId, {
        token: authResult.authorizationToken,
        context: {
          ...contextForExecution,
          sessionId: session?.synapseSessionId || sessionId || crypto.randomUUID(),
          clineSessionId: request.sessionId || sessionId,
          workspaceRoot: workspaceRoot || process.cwd(),
        },
      });

      // Cleanup pending tool calls if unbounded growth
      if (this.pendingToolCalls.size > 1000) {
        const now = Date.now();
        for (const [id, pending] of this.pendingToolCalls.entries()) {
          const expiresAt = pending.token.expiresAt ? new Date(pending.token.expiresAt).getTime() : 0;
          if (expiresAt > 0 && expiresAt < now) {
            this.pendingToolCalls.delete(id);
          }
        }
      }

      if (session) {
        session.recordAuthorizationToken(callId, authResult.authorizationToken);
      }

      // NOTE: We do not return the token to the client.
      return {
        approved: true,
        modifiedParameters: authResult.modifiedParameters,
      };
    }

    return {
      approved: true,
      modifiedParameters: authResult.modifiedParameters,
      reason: authResult.reason,
    };
  }

  /**
   * Get current health status of the engine.
   */
  getHealth(): ClineEngineHealthStatus {
    const status: ClineEngineHealthStatus["status"] =
      this.isInitialized && this.cline
        ? "HEALTHY"
        : this.initError
        ? "FAILED"
        : "UNINITIALIZED";

    return {
      status,
      isInitialized: this.isInitialized,
      activeSessionCount: this.activeSessions.size,
      activeWorkspaceCount: this.activeWorkspaces.size,
      runtimeAddress: this.cline?.runtimeAddress,
      lastError: this.initError,
      initializedAt: this.initializedAt,
    };
  }

  /**
   * Whether the engine is ready to accept session operations.
   */
  isReady(): boolean {
    return this.isInitialized && this.cline !== null;
  }

  private getCline(): ClineCore {
    if (!this.cline) {
      throw new ClineExecutionError("ClineEngine is not initialized. Call initialize() first.");
    }
    return this.cline;
  }

  /**
   * Start a new governed Cline execution session.
   */
  async startSession(options: StartEngineSessionOptions): Promise<{
    session: ClineSession;
    startResult: StartSessionResult;
  }> {
    if (options.graphEngine) {
      this.graphEngine = options.graphEngine;
    }
    if (options.simEngine) {
      this.simEngine = options.simEngine;
    }
    if (options.getTwinFn) {
      this.getTwinFn = options.getTwinFn;
    }
    if (options.workforceEngine) {
      this.workforceEngine = options.workforceEngine;
    }
    const cline = this.getCline();
    const synapseSessionId = options.synapseSessionId || crypto.randomUUID();
    const clineSessionId = synapseSessionId;
    const runtimeId = options.runtimeId || crypto.randomUUID();

    const providerId = options.modelConfig?.provider || "openrouter";
    const modelId = options.modelConfig?.modelId || "openrouter/auto";
    const apiKey = options.modelConfig?.apiKey || process.env.OPENROUTER_API_KEY || "";

    // 1. Instantiate session handle and register in activeSessions BEFORE executing turn
    // so that handleClineToolApproval can resolve tenant/agent identity during tool calls
    const session = new ClineSession({
      synapseSessionId,
      clineSessionId,
      tenantId: options.tenantId,
      agentId: options.agentId,
      missionId: options.missionId,
      taskId: options.taskId,
      runId: options.runId,
      attemptId: options.attemptId,
      workspaceId: options.workspaceId,
      workspacePath: options.workspacePath || options.cwd,
      runtimeId,
      cline,
      modelConfig: options.modelConfig,
    });

    this.activeSessions.set(synapseSessionId, session);

    // 2. Start execution via lifecycle handler without YOLO bypass
    const startResult = await executeStart({
      cline,
      input: {
        prompt: options.prompt,
        cwd: options.cwd,
        workspaceRoot: options.workspacePath || options.cwd,
        systemPrompt: options.systemPrompt ?? "You are a helpful autonomous coding assistant.",
        customInstructions: options.customInstructions ?? "",
        config: {
          sessionId: clineSessionId,
          providerId,
          modelId,
          apiKey,
          systemPrompt: options.systemPrompt ?? "You are a helpful autonomous coding assistant.",
          customInstructions: options.customInstructions ?? "",
          enableTools: true,
          enableSpawnAgent: true,
          enableAgentTeams: true,
          cwd: options.cwd,
          workspaceRoot: options.workspacePath || options.cwd,
          toolPolicies: { "*": { autoApprove: false } },
        } as any,
        localRuntime: {
          extraTools: this.graphEngine ? getGraphTools(this.graphEngine, this.simEngine, this.getTwinFn ?? ((_env: string) => null)) : []
        } as any
      },
    });

    if (startResult.sessionId && startResult.sessionId !== clineSessionId) {
      this.activeSessions.set(startResult.sessionId, session);
    }

    return {
      session,
      startResult,
    };
  }

  /**
   * Get an active managed session handle by Synapse session ID or Cline session ID.
   */
  getSession(sessionId: string): ClineSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Require an active session handle or throw ClineSessionNotFoundError.
   */
  requireSession(sessionId: string): ClineSession {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new ClineSessionNotFoundError(sessionId);
    }
    return session;
  }

  /**
   * Send a steering or follow-up prompt to a session.
   */
  async sendMessage(sessionId: string, prompt: string, delivery: "queue" | "steer" = "steer"): Promise<void> {
    const session = this.requireSession(sessionId);
    await session.sendMessage(prompt, delivery);
  }

  /**
   * Wait for a session to complete with explicit status discrimination.
   */
  async waitForSessionCompletion(sessionId: string, timeoutMs?: number): Promise<SessionCompletionResult> {
    const session = this.requireSession(sessionId);
    return session.waitForCompletion(timeoutMs);
  }

  /**
   * Subscribe to the normalized Synapse event envelope stream for a session.
   */
  subscribe(sessionId: string, listener: (event: SynapseEventEnvelope) => void): () => void {
    const session = this.requireSession(sessionId);
    return session.subscribe(listener);
  }

  /**
   * Pause active session.
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const cline = this.getCline();
    await executePause({ cline, sessionId: session.clineSessionId });
  }

  /**
   * Resume paused session.
   */
  async resumeSession(sessionId: string, resumePrompt?: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const cline = this.getCline();
    await executeResume({ cline, sessionId: session.clineSessionId, resumePrompt });
  }

  /**
   * Stop active session.
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const cline = this.getCline();
    await executeStop({ cline, sessionId: session.clineSessionId });
  }

  /**
   * Abort active session immediately.
   */
  async abortSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const cline = this.getCline();
    await executeAbort({ cline, sessionId: session.clineSessionId });
  }

  /**
   * Restart an existing session, spawning a new execution attempt handle.
   */
  async restartSession(
    sessionId: string,
    prompt: string,
    cwd: string
  ): Promise<{ session: ClineSession; startResult: StartSessionResult }> {
    const session = this.requireSession(sessionId);
    const cline = this.getCline();

    const startResult = await executeRestart({
      cline,
      sessionId: session.clineSessionId,
      startInput: {
        prompt,
        cwd,
        workspaceRoot: cwd,
      },
    });

    const newSession = new ClineSession({
      synapseSessionId: session.synapseSessionId,
      clineSessionId: startResult.sessionId,
      tenantId: session.tenantId,
      agentId: session.agentId,
      missionId: session.missionId,
      taskId: session.taskId,
      runId: session.runId,
      attemptId: crypto.randomUUID(), // New attempt for restart
      workspaceId: session.workspaceId,
      workspacePath: session.workspacePath,
      runtimeId: session.runtimeId,
      cline,
    });

    this.activeSessions.set(session.synapseSessionId, newSession);
    this.activeSessions.set(startResult.sessionId, newSession);

    return {
      session: newSession,
      startResult,
    };
  }

  /**
   * Restore a checkpoint in ClineCore.
   */
  async restoreCheckpoint(sessionId: string, checkpointId: string): Promise<any> {
    const session = this.requireSession(sessionId);
    const cline = this.getCline();
    try {
      return await cline.restore({
        sessionId: session.clineSessionId,
        checkpointId,
      });
    } catch (err: unknown) {
      throw new ClineCheckpointError(
        `Failed to restore checkpoint ${checkpointId} in session ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
        sessionId,
        checkpointId
      );
    }
  }

  /**
   * Provision and manage a workspace directory for a tenant.
   */
  async createWorkspace(tenantId: string, workspaceId: string): Promise<ClineWorkspace> {
    const baseDir = this.options.defaultWorkspaceDirectory || path.resolve(process.cwd(), ".synapse_workspaces");
    const workspace = new ClineWorkspace({
      tenantId,
      workspaceId,
      baseDirectory: baseDir,
    });

    await workspace.initialize();
    this.activeWorkspaces.set(`${tenantId}:${workspaceId}`, workspace);
    return workspace;
  }

  /**
   * Access the Cline Team coordination runtime.
   */
  getTeamRuntime(): ClineTeam {
    if (!this.teamRuntime) {
      throw new ClineExecutionError("Team runtime is not initialized.");
    }
    return this.teamRuntime;
  }

  /**
   * Create an agent team runtime.
   */
  async createTeam(options: CreateTeamOptions): Promise<ClineTeam> {
    const team = this.getTeamRuntime();
    await team.createTeam(options);
    return team;
  }

  /**
   * Dispose all active sessions and clean up resources idempotently.
   */
  dispose(): void {
    for (const session of this.activeSessions.values()) {
      session.dispose();
    }
    this.activeSessions.clear();
    this.activeWorkspaces.clear();
  }
}
