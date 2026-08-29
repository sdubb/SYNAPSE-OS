import {
  type ApprovalStatus,
  type PolicyRiskLevel,
} from "@synapse/contracts";

export interface CreateApprovalRequestOptions {
  id?: string;
  tenantId: string;
  sessionId: string;
  agentId: string;
  taskId?: string;
  workspaceId?: string;
  clineSessionId: string;
  callId: string;
  toolName: string;
  toolParameters: Record<string, unknown>;
  riskLevel: PolicyRiskLevel;
  reason?: string;
  timeoutSeconds?: number;
  requesterUserId?: string;
  sanitizedSummary?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalDecisionRecord {
  decidedByUserId: string;
  decidedByUserEmail?: string;
  decidedByRole: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  modifiedParameters?: Record<string, unknown>;
  decidedAt: string;
}

export interface SanitizedApprovalRequest {
  id: string;
  tenantId: string;
  sessionId: string;
  agentId: string;
  taskId?: string;
  workspaceId?: string;
  clineSessionId: string;
  callId: string;
  toolName: string;
  toolParameters: Record<string, unknown>;
  riskLevel: PolicyRiskLevel;
  reason?: string;
  status: ApprovalStatus;
  timeoutSeconds: number;
  expiresAt: string;
  createdAt: string;
  resolvedAt?: string;
  requesterUserId?: string;
  sanitizedSummary: string;
  decisions: ApprovalDecisionRecord[];
  requiredApprovals: number;
  remainingApprovals: number;
  metadata: Record<string, unknown>;
}

export class ApprovalRequestFactory {
  public static create(options: CreateApprovalRequestOptions, requiredApprovers = 1): SanitizedApprovalRequest {
    const id = options.id ?? crypto.randomUUID();
    const timeoutSeconds = options.timeoutSeconds ?? 300;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000).toISOString();
    const sanitizedParams = this.sanitizeParameters(options.toolParameters);
    const summary = options.sanitizedSummary ?? this.generateSummary(options.toolName, sanitizedParams);

    return {
      id,
      tenantId: options.tenantId,
      sessionId: options.sessionId,
      agentId: options.agentId,
      taskId: options.taskId,
      workspaceId: options.workspaceId,
      clineSessionId: options.clineSessionId,
      callId: options.callId,
      toolName: options.toolName,
      toolParameters: sanitizedParams,
      riskLevel: options.riskLevel,
      reason: options.reason,
      status: "pending" as ApprovalStatus,
      timeoutSeconds,
      expiresAt,
      createdAt: now.toISOString(),
      requesterUserId: options.requesterUserId,
      sanitizedSummary: summary,
      decisions: [],
      requiredApprovals: requiredApprovers,
      remainingApprovals: requiredApprovers,
      metadata: options.metadata ?? {},
    };
  }

  public static sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ["token", "key", "secret", "password", "auth", "jwt", "credential", "privatekey"];

    for (const [k, v] of Object.entries(params)) {
      const lowerKey = k.toLowerCase();
      const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

      if (isSensitive && typeof v === "string") {
        sanitized[k] = "[REDACTED_SECRET]";
      } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        sanitized[k] = this.sanitizeParameters(v as Record<string, unknown>);
      } else {
        sanitized[k] = v;
      }
    }

    return sanitized;
  }

  private static generateSummary(toolName: string, params: Record<string, unknown>): string {
    if (toolName.includes("command") && typeof params["command"] === "string") {
      return `Execute shell command: ${params["command"]}`;
    }
    if (typeof params["CommandLine"] === "string") {
      return `Execute command: ${params["CommandLine"]}`;
    }
    if (typeof params["TargetFile"] === "string") {
      return `Modify file: ${params["TargetFile"]}`;
    }
    if (typeof params["path"] === "string") {
      return `Access path: ${params["path"]}`;
    }
    if (typeof params["url"] === "string") {
      return `Network request: ${params["url"]}`;
    }
    return `Invoke tool: ${toolName}`;
  }
}

export interface ApprovalStore {
  save(request: SanitizedApprovalRequest): Promise<void>;
  getById(requestId: string): Promise<SanitizedApprovalRequest | null>;
  listPending(tenantId?: string): Promise<SanitizedApprovalRequest[]>;
  update(request: SanitizedApprovalRequest): Promise<void>;
  delete(requestId: string): Promise<void>;
}

export class InMemoryApprovalStore implements ApprovalStore {
  private requests: Map<string, SanitizedApprovalRequest> = new Map();

  public async save(request: SanitizedApprovalRequest): Promise<void> {
    this.requests.set(request.id, { ...request });
  }

  public async getById(requestId: string): Promise<SanitizedApprovalRequest | null> {
    const req = this.requests.get(requestId);
    return req ? { ...req } : null;
  }

  public async listPending(tenantId?: string): Promise<SanitizedApprovalRequest[]> {
    const list: SanitizedApprovalRequest[] = [];
    for (const req of this.requests.values()) {
      if (req.status === "pending") {
        if (!tenantId || req.tenantId === tenantId) {
          list.push({ ...req });
        }
      }
    }
    return list;
  }

  public async update(request: SanitizedApprovalRequest): Promise<void> {
    this.requests.set(request.id, { ...request });
  }

  public async delete(requestId: string): Promise<void> {
    this.requests.delete(requestId);
  }
}
