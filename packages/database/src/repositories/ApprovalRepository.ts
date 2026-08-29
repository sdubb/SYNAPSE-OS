import { eq, and, desc, lt } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { approvals, type ApprovalRecord, type NewApprovalRecord } from "../schemas/approvals.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class ApprovalRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "ApprovalRepository");
    }
    return tenantId;
  }

  async findById(id: string, tenantId?: string): Promise<ApprovalRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, id), eq(approvals.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async findByCallId(sessionId: string, callId: string, tenantId?: string): Promise<ApprovalRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.sessionId, sessionId),
          eq(approvals.callId, callId),
          eq(approvals.tenantId, tid)
        )
      )
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: Omit<NewApprovalRecord, "tenantId"> & { tenantId?: string }): Promise<ApprovalRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const insertData: NewApprovalRecord = {
      ...data,
      tenantId: tid,
    };
    const results = await this.db.insert(approvals).values(insertData).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create approval record");
    return created;
  }

  async resolveDecision(
    id: string,
    data: {
      decision: "APPROVED" | "REJECTED";
      decidedByUserId?: string;
      decisionReason?: string;
      modifiedParameters?: unknown;
    },
    tenantId?: string
  ): Promise<ApprovalRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const status = data.decision === "APPROVED" ? "approved" : "rejected";

    const results = await this.db
      .update(approvals)
      .set({
        status,
        decision: data.decision,
        decidedByUserId: data.decidedByUserId,
        decisionReason: data.decisionReason,
        modifiedParameters: data.modifiedParameters,
        resolvedAt: new Date(),
      })
      .where(and(eq(approvals.id, id), eq(approvals.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async markExpired(tenantId?: string): Promise<number> {
    const tid = this.resolveTenantId(tenantId);
    const now = new Date();

    const results = await this.db
      .update(approvals)
      .set({
        status: "timed_out",
        resolvedAt: now,
      })
      .where(
        and(
          eq(approvals.tenantId, tid),
          eq(approvals.status, "pending"),
          lt(approvals.expiresAt, now)
        )
      )
      .returning({ id: approvals.id });

    return results.length;
  }

  async list(options?: {
    tenantId?: string;
    sessionId?: string;
    agentId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApprovalRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(approvals.tenantId, tid)];

    if (options?.sessionId) {
      conditions.push(eq(approvals.sessionId, options.sessionId));
    }
    if (options?.agentId) {
      conditions.push(eq(approvals.agentId, options.agentId));
    }
    if (options?.status) {
      conditions.push(eq(approvals.status, options.status));
    }

    return await this.db
      .select()
      .from(approvals)
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
