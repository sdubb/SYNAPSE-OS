import crypto from "node:crypto";
import { type SanitizedApprovalRequest } from "./ApprovalRequest.js";

export type ApprovalAuditEventType =
  | "approval.requested"
  | "approval.granted"
  | "approval.rejected"
  | "approval.modified"
  | "approval.timed_out"
  | "approval.cancelled";

export interface ApprovalAuditRecord {
  auditId: string;
  eventType: ApprovalAuditEventType;
  requestId: string;
  tenantId: string;
  agentId: string;
  sessionId: string;
  toolName: string;
  riskLevel: string;
  actorUserId?: string;
  actorRole?: string;
  decision?: "APPROVED" | "REJECTED";
  reason?: string;
  approvedParameters?: Record<string, unknown>;
  timestamp: string;
  payloadHash: string;
  previousHash?: string;
}

export type AuditSink = (record: ApprovalAuditRecord) => Promise<void> | void;

export class ApprovalAudit {
  private records: ApprovalAuditRecord[] = [];
  private lastHash = "0000000000000000000000000000000000000000000000000000000000000000";
  private sinks: AuditSink[] = [];

  constructor(customSinks?: AuditSink[]) {
    if (customSinks) {
      this.sinks.push(...customSinks);
    }
  }

  public registerSink(sink: AuditSink): void {
    this.sinks.push(sink);
  }

  public async emit(
    eventType: ApprovalAuditEventType,
    request: SanitizedApprovalRequest,
    options?: {
      actorUserId?: string;
      actorRole?: string;
      decision?: "APPROVED" | "REJECTED";
      reason?: string;
      approvedParameters?: Record<string, unknown>;
    }
  ): Promise<ApprovalAuditRecord> {
    const timestamp = new Date().toISOString();
    const auditId = crypto.randomUUID();

    const payloadToHash = JSON.stringify({
      auditId,
      eventType,
      requestId: request.id,
      tenantId: request.tenantId,
      agentId: request.agentId,
      sessionId: request.sessionId,
      toolName: request.toolName,
      riskLevel: request.riskLevel,
      actorUserId: options?.actorUserId,
      actorRole: options?.actorRole,
      decision: options?.decision,
      reason: options?.reason,
      approvedParameters: options?.approvedParameters,
      timestamp,
      previousHash: this.lastHash,
    });

    const payloadHash = crypto.createHash("sha256").update(payloadToHash).digest("hex");

    const record: ApprovalAuditRecord = {
      auditId,
      eventType,
      requestId: request.id,
      tenantId: request.tenantId,
      agentId: request.agentId,
      sessionId: request.sessionId,
      toolName: request.toolName,
      riskLevel: request.riskLevel,
      actorUserId: options?.actorUserId,
      actorRole: options?.actorRole,
      decision: options?.decision,
      reason: options?.reason,
      approvedParameters: options?.approvedParameters,
      timestamp,
      payloadHash,
      previousHash: this.lastHash,
    };

    this.lastHash = payloadHash;
    this.records.push(record);

    for (const sink of this.sinks) {
      try {
        await sink(record);
      } catch (err) {
        console.error("Failed to emit audit record to sink:", err);
      }
    }

    return record;
  }

  public getRecords(requestId?: string): ApprovalAuditRecord[] {
    if (!requestId) return [...this.records];
    return this.records.filter((r) => r.requestId === requestId);
  }
}
