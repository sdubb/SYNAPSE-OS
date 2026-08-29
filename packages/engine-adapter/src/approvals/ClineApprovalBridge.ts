import type { ToolApprovalRequest as ClineToolApprovalRequest, ToolApprovalResult as ClineToolApprovalResult } from "@cline/shared";
import type { ToolApprovalRequest as SynapseToolApprovalRequest, ApprovalDecision } from "@synapse/contracts";
import { ClineApprovalTimeoutError } from "../errors/ClineEngineError.js";

export interface ApprovalHandler {
  onRequestApproval(request: SynapseToolApprovalRequest): Promise<ApprovalDecision>;
}

export class ClineApprovalBridge {
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (result: ClineToolApprovalResult) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
      request: SynapseToolApprovalRequest;
    }
  >();

  constructor(
    private readonly tenantId: string,
    private readonly defaultTimeoutSeconds = 300,
    private readonly handler?: ApprovalHandler
  ) {}

  /**
   * Intercept an approval request coming from Cline runtime hooks/tools.
   */
  async handleClineToolApproval(
    clineRequest: ClineToolApprovalRequest,
    context: {
      synapseSessionId: string;
      agentId: string;
      taskId?: string;
      workspaceId?: string;
    }
  ): Promise<ClineToolApprovalResult> {
    const expiresAt = new Date(Date.now() + this.defaultTimeoutSeconds * 1000).toISOString();

    const synapseRequest: SynapseToolApprovalRequest = {
      id: crypto.randomUUID(),
      tenantId: this.tenantId,
      sessionId: context.synapseSessionId,
      agentId: context.agentId,
      taskId: context.taskId,
      workspaceId: context.workspaceId,
      clineSessionId: clineRequest.sessionId,
      callId: clineRequest.callId,
      toolName: clineRequest.toolName,
      toolParameters: (clineRequest.toolParameters as Record<string, unknown>) || {},
      riskLevel: "MEDIUM",
      status: "pending",
      timeoutSeconds: this.defaultTimeoutSeconds,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    // If an external handler is directly attached, delegate
    if (this.handler) {
      try {
        const decision = await this.handler.onRequestApproval(synapseRequest);
        return {
          callId: clineRequest.callId,
          approved: decision.decision === "APPROVED",
          modifiedParameters: decision.modifiedParameters,
          reason: decision.reason,
        };
      } catch (err: unknown) {
        return {
          callId: clineRequest.callId,
          approved: false,
          reason: `Approval handler rejected with error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // Otherwise register as pending promise waiting for resolveApproval()
    return new Promise<ClineToolApprovalResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(clineRequest.callId);
        reject(new ClineApprovalTimeoutError(clineRequest.callId, clineRequest.sessionId));
      }, this.defaultTimeoutSeconds * 1000);

      this.pendingRequests.set(clineRequest.callId, {
        resolve,
        reject,
        timer,
        request: synapseRequest,
      });
    });
  }

  /**
   * Resolve a pending tool approval from Synapse control plane / human reviewer.
   */
  resolveApproval(decision: ApprovalDecision & { callId: string }): boolean {
    const pending = this.pendingRequests.get(decision.callId);
    if (!pending) {
      return false;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(decision.callId);

    pending.resolve({
      callId: decision.callId,
      approved: decision.decision === "APPROVED",
      modifiedParameters: decision.modifiedParameters,
      reason: decision.reason,
    });

    return true;
  }

  /**
   * Get all active pending approval requests.
   */
  getPendingRequests(): SynapseToolApprovalRequest[] {
    return Array.from(this.pendingRequests.values()).map((p) => p.request);
  }

  /**
   * Clear and reject all pending requests.
   */
  clear(): void {
    for (const [callId, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`Approval request for call ${callId} was cancelled.`));
    }
    this.pendingRequests.clear();
  }
}
