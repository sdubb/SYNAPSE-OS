import type { ClineCore, CoreSessionEvent } from "@cline/core";
import type { TokenUsage, SynapseEventEnvelope } from "@synapse/contracts";
import { ClineEventAdapter, type SynapseEventListener } from "./events/ClineEventAdapter.js";
import { ClineApprovalBridge } from "./approvals/ClineApprovalBridge.js";
import { ClineExecutionError } from "./errors/ClineEngineError.js";

export interface ClineSessionInitOptions {
  synapseSessionId: string;
  clineSessionId: string;
  tenantId: string;
  agentId: string;
  missionId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  workspaceId: string;
  workspacePath?: string;
  runtimeId: string;
  cline: ClineCore;
  modelConfig?: {
    provider?: string;
    modelId?: string;
    inputPricePer1M?: number;
    outputPricePer1M?: number;
  };
}

export type SessionExecutionStatus =
  | "INITIALIZING"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export interface SessionCompletionResult {
  readonly status: "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT" | "STILL_RUNNING";
  readonly messages: Array<{
    type: string;
    content: string;
    toolName?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
  readonly tokenUsage: TokenUsage;
  readonly checkpoints: string[];
  readonly error?: string;
}

export class ClineSession {
  readonly synapseSessionId: string;
  readonly clineSessionId: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly missionId?: string;
  readonly taskId?: string;
  readonly runId?: string;
  readonly attemptId?: string;
  readonly workspaceId: string;
  readonly workspacePath?: string;
  readonly runtimeId: string;

  private readonly cline: ClineCore;
  private readonly eventAdapter: ClineEventAdapter;
  private readonly approvalBridge: ClineApprovalBridge;
  private readonly modelConfig: {
    provider: string;
    modelId: string;
    inputPricePer1M: number;
    outputPricePer1M: number;
  };

  private status: SessionExecutionStatus = "INITIALIZING";
  private tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  };
  private checkpoints: string[] = [];
  private isEnded = false;
  private completionStatus: "COMPLETED" | "FAILED" | "CANCELLED" = "COMPLETED";
  private completionError?: string;
  private completionResolve?: () => void;
  private completionPromise: Promise<void>;
  private activeStreamBuffer = "";

  private collectedMessages: Array<{
    type: string;
    content: string;
    toolName?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }> = [];

  constructor(options: ClineSessionInitOptions) {
    this.synapseSessionId = options.synapseSessionId;
    this.clineSessionId = options.clineSessionId;
    this.tenantId = options.tenantId;
    this.agentId = options.agentId;
    this.missionId = options.missionId;
    this.taskId = options.taskId;
    this.runId = options.runId;
    this.attemptId = options.attemptId;
    this.workspaceId = options.workspaceId;
    this.workspacePath = options.workspacePath;
    this.runtimeId = options.runtimeId;
    this.cline = options.cline;

    this.modelConfig = {
      provider: options.modelConfig?.provider || "openrouter",
      modelId: options.modelConfig?.modelId || "auto",
      inputPricePer1M: options.modelConfig?.inputPricePer1M ?? 3.0,
      outputPricePer1M: options.modelConfig?.outputPricePer1M ?? 15.0,
    };

    this.approvalBridge = new ClineApprovalBridge(options.tenantId);
    this.eventAdapter = new ClineEventAdapter(options.cline, {
      tenantId: options.tenantId,
      agentId: options.agentId,
      sessionId: options.synapseSessionId,
      taskId: options.taskId,
      workspaceId: options.workspaceId,
      runtimeId: options.runtimeId,
    });

    this.completionPromise = new Promise<void>((resolve) => {
      this.completionResolve = resolve;
    });

    this.status = "ACTIVE";
    this.setupInternalEventListeners();
  }

  private setupInternalEventListeners(): void {
    this.eventAdapter.subscribe((envelope: SynapseEventEnvelope) => {
      // 1. Streaming chunks: buffer text without duplicating as assistant messages (Critical Requirement #11)
      if (envelope.eventType === "session.chunk" || envelope.eventType === "stream.delta") {
        const payload = envelope.payload as { stream?: string; chunk?: string; text?: string; delta?: string };
        const deltaText = payload.chunk || payload.text || payload.delta || "";
        if (deltaText) {
          this.activeStreamBuffer += deltaText;
        }
      }

      // 2. Final message completed: append single consolidated message to collectedMessages
      if (envelope.eventType === "session.message" || envelope.eventType === "message.completed") {
        const payload = envelope.payload as {
          event?: { type?: string; content?: string; message?: string; text?: string };
          message?: { content?: string; text?: string };
          content?: string;
        };
        const evt = payload.event || payload.message;
        const text =
          (evt as { content?: string; message?: string; text?: string } | undefined)?.content ||
          (evt as { content?: string; message?: string; text?: string } | undefined)?.message ||
          (evt as { content?: string; message?: string; text?: string } | undefined)?.text ||
          payload.content ||
          this.activeStreamBuffer;

        if (text) {
          this.collectedMessages.push({
            type: "assistant",
            content: text,
            timestamp: envelope.timestamp,
          });
        }
        this.activeStreamBuffer = "";
      }

      // 3. Tool execution events
      if (envelope.eventType === "tool.executed" || envelope.eventType === "tool.completed") {
        const payload = envelope.payload as {
          toolName?: string;
          inputTokens?: number;
          outputTokens?: number;
          durationMs?: number;
        };
        this.collectedMessages.push({
          type: "tool",
          content: `Executed tool: ${payload.toolName || "unknown"}`,
          toolName: payload.toolName,
          timestamp: envelope.timestamp,
          metadata: { durationMs: payload.durationMs },
        });

        // Model-aware token pricing calculation (Critical Requirement #14)
        const inp = payload.inputTokens ?? 0;
        const out = payload.outputTokens ?? 0;
        if (inp || out) {
          this.tokenUsage.promptTokens += inp;
          this.tokenUsage.completionTokens += out;
          this.tokenUsage.totalTokens = this.tokenUsage.promptTokens + this.tokenUsage.completionTokens;
          const inputCost = (this.tokenUsage.promptTokens / 1_000_000) * this.modelConfig.inputPricePer1M;
          const outputCost = (this.tokenUsage.completionTokens / 1_000_000) * this.modelConfig.outputPricePer1M;
          this.tokenUsage.estimatedCostUsd = Number((inputCost + outputCost).toFixed(6));
        }
      }

      // 4. Tool request events
      if (envelope.eventType === "tool.requested") {
        const payload = envelope.payload as {
          toolName?: string;
          event?: { name?: string; arguments?: unknown };
          arguments?: unknown;
        };
        const toolName = payload.toolName || payload.event?.name || "unknown";
        this.collectedMessages.push({
          type: "tool_call",
          content: `Calling tool: ${toolName}`,
          toolName,
          timestamp: envelope.timestamp,
          metadata: { arguments: payload.arguments || payload.event?.arguments },
        });
      }

      // 5. Checkpoints
      if (envelope.eventType === "session.checkpoint_created") {
        const payload = envelope.payload as { snapshotId?: string };
        if (payload.snapshotId && !this.checkpoints.includes(payload.snapshotId)) {
          this.checkpoints.push(payload.snapshotId);
        }
      }

      // 6. Session end / failure handling
      if (envelope.eventType === "session.ended") {
        this.isEnded = true;
        this.status = "COMPLETED";
        this.completionStatus = "COMPLETED";
        this.completionResolve?.();
      }

      if (envelope.eventType === "system.error" || envelope.eventType === "task.failed") {
        const payload = envelope.payload as { error?: string; message?: string };
        this.completionError = payload.error || payload.message || "Execution error encountered";
        this.completionStatus = "FAILED";
      }
    });
  }

  /**
   * Subscribe to the normalized event stream of this session.
   */
  subscribe(listener: SynapseEventListener): () => void {
    return this.eventAdapter.subscribe(listener);
  }

  /**
   * Dispatch a native Cline event into this session's adapter.
   */
  dispatchNativeEvent(event: CoreSessionEvent): SynapseEventEnvelope {
    return this.eventAdapter.dispatchNativeEvent(event);
  }

  /**
   * Send a steering or follow-up prompt to the active Cline session.
   */
  async sendMessage(prompt: string, delivery: "queue" | "steer" = "steer"): Promise<void> {
    if (this.isEnded) {
      throw new ClineExecutionError("Cannot send message to an ended session.", this.clineSessionId);
    }
    await this.cline.send({
      sessionId: this.clineSessionId,
      prompt,
      delivery,
    });
  }

  /**
   * Access the approval bridge for this session.
   */
  getApprovalBridge(): ClineApprovalBridge {
    return this.approvalBridge;
  }

  /**
   * Get current aggregated token usage.
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * Get all checkpoints captured during this session.
   */
  getCheckpoints(): string[] {
    return [...this.checkpoints];
  }

  /**
   * Get current status of the session.
   */
  getStatus(): SessionExecutionStatus {
    return this.status;
  }

  /**
   * Wait for the Cline session to complete execution with explicit status discrimination (Critical Requirement #12).
   */
  async waitForCompletion(timeoutMs = 120_000): Promise<SessionCompletionResult> {
    if (this.isEnded) {
      return {
        status: this.completionStatus,
        messages: [...this.collectedMessages],
        tokenUsage: { ...this.tokenUsage },
        checkpoints: [...this.checkpoints],
        error: this.completionError,
      };
    }

    let isTimedOut = false;
    let timerHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<void>((resolve) => {
      timerHandle = setTimeout(() => {
        isTimedOut = true;
        resolve();
      }, timeoutMs);
    });

    await Promise.race([this.completionPromise, timeoutPromise]);

    if (timerHandle) {
      clearTimeout(timerHandle);
    }

    if (isTimedOut && !this.isEnded) {
      return {
        status: "TIMED_OUT",
        messages: [...this.collectedMessages],
        tokenUsage: { ...this.tokenUsage },
        checkpoints: [...this.checkpoints],
        error: `Session execution timed out after ${timeoutMs}ms`,
      };
    }

    return {
      status: this.completionStatus,
      messages: [...this.collectedMessages],
      tokenUsage: { ...this.tokenUsage },
      checkpoints: [...this.checkpoints],
      error: this.completionError,
    };
  }

  /**
   * Get all collected messages so far.
   */
  getCollectedMessages(): Array<{
    type: string;
    content: string;
    toolName?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }> {
    return [...this.collectedMessages];
  }

  /**
   * Check if session has concluded.
   */
  hasEnded(): boolean {
    return this.isEnded;
  }

  /**
   * Clean up session resources idempotently.
   */
  dispose(): void {
    this.isEnded = true;
    this.status = "CANCELLED";
    this.approvalBridge.clear();
    this.eventAdapter.dispose();
  }
}
