import crypto from "node:crypto";
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
  /**
   * Cryptographic authorization token binding the decision to specific call parameters.
   * Must be presented back during execution to prove the authorization is valid for
   * exactly this tool call with exactly these arguments.
   */
  readonly authorizationToken?: AuthorizationToken;
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

/**
 * Cryptographic authorization token that binds an authorization decision to a specific
 * tool invocation. Prevents:
 * - Argument mutation after authorization (different hash = invalid token)
 * - Authorization replay (bound to callId + timestamp)
 * - Cross-session/cross-agent authorization reuse (bound to full context)
 */
export interface AuthorizationToken {
  /** Unique authorization token ID */
  readonly tokenId: string;
  /** SHA-256 hash of canonical tool arguments at authorization time */
  readonly argumentsHash: string;
  /** The callId this authorization is bound to */
  readonly callId: string;
  /** The tool name this authorization is bound to */
  readonly toolName: string;
  /** Tenant, agent, session binding */
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId: string;
  /** Policy version at authorization time */
  readonly policyVersion: string;
  /** Timestamp of authorization */
  readonly authorizedAt: number;
  /** Token expiry (authorization is only valid for a short window) */
  readonly expiresAt: number;
  /** HMAC signature over the token fields */
  readonly signature: string;
}

/**
 * Computes a deterministic SHA-256 hash of tool arguments for binding.
 */
export function computeArgumentsHash(args: Record<string, unknown>): string {
  const canonical = canonicalStringify(args);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Deterministic JSON stringify with sorted keys for hash stability.
 */
function canonicalStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "number") return Number.isFinite(obj) ? String(obj) : "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(",")}]`;
  }
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((k) => record[k] !== undefined && typeof record[k] !== "function")
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(obj);
}
