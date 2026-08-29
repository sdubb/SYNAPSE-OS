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
  taskId?: string;
  workspaceId: string;
  runtimeId: string;
  cline: ClineCore;
}

export class ClineSession {
  readonly synapseSessionId: string;
  readonly clineSessionId: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly taskId?: string;
  readonly workspaceId: string;
  readonly runtimeId: string;

  private readonly cline: ClineCore;
  private readonly eventAdapter: ClineEventAdapter;
  private readonly approvalBridge: ClineApprovalBridge;
  private tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  };
  private checkpoints: string[] = [];
  private isEnded = false;
  private completionResolve?: () => void;
  private completionPromise: Promise<void>;
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
    this.taskId = options.taskId;
    this.workspaceId = options.workspaceId;
    this.runtimeId = options.runtimeId;
    this.cline = options.cline;

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

    this.setupInternalEventListeners();
  }

  private setupInternalEventListeners(): void {
    this.eventAdapter.subscribe((envelope: SynapseEventEnvelope) => {
      // 1. Collect streaming text chunks
      //    EventMapper maps Cline "chunk" → "session.chunk" with { stream, chunk, timestamp }
      if (envelope.eventType === "session.chunk") {
        const payload = envelope.payload as { stream?: string; chunk?: string; text?: string };
        const text = payload.chunk || payload.text;
        if (text) {
          this.collectedMessages.push({
            type: 'assistant',
            content: text,
            timestamp: envelope.timestamp,
            metadata: { stream: payload.stream },
          });
        }
      }

      // 2. Collect assistant messages from agent_event → message
      //    EventMapper maps Cline "agent_event" with message type → "session.message"
      if (envelope.eventType === "session.message") {
        const payload = envelope.payload as {
          event?: { type?: string; content?: string; message?: string; text?: string };
        };
        const evt = payload.event;
        if (evt) {
          const text = evt.content || evt.message || evt.text;
          if (text) {
            this.collectedMessages.push({
              type: 'assistant',
              content: text,
              timestamp: envelope.timestamp,
            });
          }
        }
      }

      // 3. Collect tool execution events (from hook events)
      if (envelope.eventType === "tool.executed") {
        const payload = envelope.payload as {
          toolName?: string;
          inputTokens?: number;
          outputTokens?: number;
          hookEventName?: string;
        };
        this.collectedMessages.push({
          type: 'tool',
          content: `Executed tool: ${payload.toolName || 'unknown'}`,
          toolName: payload.toolName,
          timestamp: envelope.timestamp,
        });

        // Account for token usage from hook events
        const inp = payload.inputTokens ?? 0;
        const out = payload.outputTokens ?? 0;
        if (inp || out) {
          this.tokenUsage.promptTokens += inp;
          this.tokenUsage.completionTokens += out;
          this.tokenUsage.totalTokens = this.tokenUsage.promptTokens + this.tokenUsage.completionTokens;
          this.tokenUsage.estimatedCostUsd = (this.tokenUsage.totalTokens / 1000) * 0.003;
        }
      }

      // 4. Collect tool requests (tool_call from agent_event)
      if (envelope.eventType === "tool.requested") {
        const payload = envelope.payload as {
          toolName?: string;
          event?: { name?: string; arguments?: unknown };
        };
        const toolName = payload.toolName || payload.event?.name || 'unknown';
        this.collectedMessages.push({
          type: 'tool_call',
          content: `Calling tool: ${toolName}`,
          toolName,
          timestamp: envelope.timestamp,
          metadata: { arguments: payload.event?.arguments },
        });
      }

      // 5. Track checkpoint events
      if (envelope.eventType === "session.checkpoint_created") {
        const payload = envelope.payload as { snapshotId?: string };
        if (payload.snapshotId && !this.checkpoints.includes(payload.snapshotId)) {
          this.checkpoints.push(payload.snapshotId);
        }
      }

      // 6. Track session end and resolve completion promise
      if (envelope.eventType === "session.ended") {
        this.isEnded = true;
        this.completionResolve?.();
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
   * Wait for the Cline session to complete execution.
   * Resolves when the session ends or after timeoutMs (default 120s).
   * Returns all collected messages from the execution.
   */
  async waitForCompletion(timeoutMs = 120_000): Promise<{
    messages: Array<{ type: string; content: string; toolName?: string; timestamp: number; metadata?: Record<string, unknown> }>;
    tokenUsage: TokenUsage;
    checkpoints: string[];
  }> {
    if (this.isEnded) {
      return {
        messages: [...this.collectedMessages],
        tokenUsage: { ...this.tokenUsage },
        checkpoints: [...this.checkpoints],
      };
    }

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), timeoutMs);
    });

    await Promise.race([this.completionPromise, timeoutPromise]);

    return {
      messages: [...this.collectedMessages],
      tokenUsage: { ...this.tokenUsage },
      checkpoints: [...this.checkpoints],
    };
  }

  /**
   * Get all collected messages so far (non-blocking).
   */
  getCollectedMessages(): Array<{ type: string; content: string; toolName?: string; timestamp: number; metadata?: Record<string, unknown> }> {
    return [...this.collectedMessages];
  }

  /**
   * Check if session has concluded.
   */
  hasEnded(): boolean {
    return this.isEnded;
  }

  /**
   * Clean up session resources and listeners.
   */
  dispose(): void {
    this.completionResolve?.();
    this.approvalBridge.clear();
    this.eventAdapter.dispose();
  }
}
