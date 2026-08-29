import crypto from "node:crypto";
import * as path from "node:path";
import { ClineCore, type ClineCoreOptions, type RestoreResult } from "@cline/core";
import type { StartSessionResult } from "@cline/core";
import { ToolGateway, globalToolGateway } from "@synapse/tool-gateway";
import { ClineSession } from "./ClineSession.js";
import { ClineWorkspace } from "./ClineWorkspace.js";
import { ClineTeam, type CreateTeamOptions } from "./ClineTeam.js";
import { executeStart, executePause, executeResume, executeAbort, executeStop, executeRestart } from "./lifecycle/index.js";
import { ClineSessionNotFoundError, ClineExecutionError, ClineCheckpointError } from "./errors/ClineEngineError.js";
import type { SynapseEventEnvelope } from "@synapse/contracts";
import type { SessionCompletionResult } from "./ClineSession.js";

export interface ClineEngineOptions {
  clientName?: string;
  defaultWorkspaceDirectory?: string;
  coreOptions?: ClineCoreOptions;
  toolGateway?: ToolGateway;
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

export class ClineEngine {
  private cline: ClineCore | null = null;
  private readonly activeSessions = new Map<string, ClineSession>();
  private readonly activeWorkspaces = new Map<string, ClineWorkspace>();
  private teamRuntime: ClineTeam | null = null;
  private isInitialized = false;
  private initError: string | undefined;
  private initializedAt: Date | undefined;
  public readonly toolGateway: ToolGateway;

  constructor(private readonly options: ClineEngineOptions = {}) {
    this.toolGateway = options.toolGateway ?? globalToolGateway;
  }

  /**
   * Initialize native ClineCore instance and wire authoritative Synapse Tool Gateway.
   * NO UNCONDITIONAL AUTO-APPROVAL OR YOLO IN PRODUCTION EXECUTION PATH.
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
        },
        ...this.options.coreOptions,
      });

      this.teamRuntime = new ClineTeam(this.cline);
      this.isInitialized = true;
      this.initError = undefined;
      this.initializedAt = new Date();
    } catch (err: unknown) {
      this.initError = err instanceof Error ? err.message : String(err);
      this.isInitialized = false;
      throw err;
    }
  }

  /**
   * Intercepts tool requests originating from Cline execution substrate and delegates
   * to Synapse ToolGateway (Policy -> Safety -> Capability -> Approval -> Workspace).
   */
  private async handleClineToolApproval(
    request: any
  ): Promise<{ approved: boolean; reason?: string; modifiedParameters?: Record<string, unknown> }> {
    const sessionId = request.sessionId || request.conversationId;
    const session = sessionId ? this.getSession(sessionId) : undefined;

    const toolName = request.toolName || request.name || "unknown";
    const toolParameters = (request.toolParameters || request.input || request.arguments || {}) as Record<string, unknown>;
    const callId = request.callId || request.toolCallId || crypto.randomUUID();

    const authResult = await this.toolGateway.evaluateAndAuthorizeToolCall({
      tenantId: session?.tenantId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      agentId: session?.agentId || request.agentId || "general-agent",
      missionId: session?.missionId,
      taskId: session?.taskId,
      runId: session?.runId,
      attemptId: session?.attemptId,
      sessionId: session?.synapseSessionId || sessionId || crypto.randomUUID(),
      clineSessionId: request.sessionId || sessionId,
      workspaceId: session?.workspaceId,
      workspaceRoot: session?.workspacePath || process.cwd(),
      runtimeId: session?.runtimeId,
      toolName,
      toolArguments: toolParameters,
      callId,
    });

    if (!authResult.authorized) {
      return {
        approved: false,
        reason: authResult.reason || "Action blocked by Synapse Governance",
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
    const cline = this.getCline();
    const synapseSessionId = options.synapseSessionId || crypto.randomUUID();
    const runtimeId = options.runtimeId || crypto.randomUUID();

    const providerId = options.modelConfig?.provider || "openrouter";
    const modelId = options.modelConfig?.modelId || "openrouter/auto";
    const apiKey = options.modelConfig?.apiKey || process.env.OPENROUTER_API_KEY || "";

    // 1. Start execution via lifecycle handler without YOLO bypass
    const startResult = await executeStart({
      cline,
      input: {
        prompt: options.prompt,
        cwd: options.cwd,
        workspaceRoot: options.workspacePath || options.cwd,
        systemPrompt: options.systemPrompt ?? "You are a helpful autonomous coding assistant.",
        customInstructions: options.customInstructions ?? "",
        config: {
          providerId,
          modelId,
          apiKey,
          systemPrompt: options.systemPrompt ?? "You are a helpful autonomous coding assistant.",
          customInstructions: options.customInstructions ?? "",
          enableTools: true,
          enableSpawnAgent: false,
          enableAgentTeams: false,
          cwd: options.cwd,
          workspaceRoot: options.workspacePath || options.cwd,
        } as any,
      },
    });

    const clineSessionId = startResult.sessionId;

    // 2. Wrap into managed ClineSession handle with full metadata
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
    this.activeSessions.set(clineSessionId, session);

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
  async restoreCheckpoint(sessionId: string, checkpointId: string): Promise<RestoreResult> {
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
