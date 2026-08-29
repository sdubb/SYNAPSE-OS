import type { PolicyRiskLevel } from "@synapse/contracts";

export interface ToolInvocationContext {
  readonly tenantId: string;
  readonly agentId: string;
  readonly missionId?: string;
  readonly taskId?: string;
  readonly runId?: string;
  readonly attemptId?: string;
  readonly sessionId: string;
  readonly clineSessionId?: string;
  readonly workspaceId?: string;
  readonly workspaceRoot?: string;
  readonly runtimeId?: string;
  readonly userId?: string;
  readonly toolName: string;
  readonly toolArguments: Record<string, unknown>;
  readonly callId?: string;
  readonly environment?: Record<string, string>;
  readonly allowedCapabilities?: readonly string[];
}

export type ToolAuthorizationStatus = "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL" | "DENIED";

export interface ToolAuthorizationResult {
  readonly authorized: boolean;
  readonly decision: ToolAuthorizationStatus;
  readonly reason: string;
  readonly remediation?: string;
  readonly riskLevel: PolicyRiskLevel;
  readonly modifiedParameters?: Record<string, unknown>;
  readonly approvalRequestId?: string;
  readonly evidenceId?: string;
  readonly timestamp: number;
}

export interface ToolExecutionResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
  readonly durationMs: number;
  readonly evidenceId?: string;
  readonly auditEventId?: string;
  readonly modifiedParameters?: Record<string, unknown>;
}
