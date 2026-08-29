import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { auditLogs, type AuditLogRecord, type NewAuditLogRecord } from "../schemas/audits.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class AuditRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "AuditRepository");
    }
    return tenantId;
  }

  async record(data: Omit<NewAuditLogRecord, "tenantId"> & { tenantId?: string }): Promise<AuditLogRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const insertData: NewAuditLogRecord = {
      ...data,
      tenantId: tid,
    };
    const results = await this.db.insert(auditLogs).values(insertData).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to record audit log");
    return created;
  }

  async findById(id: string, tenantId?: string): Promise<AuditLogRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.id, id), eq(auditLogs.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async list(options?: {
    tenantId?: string;
    eventType?: string;
    traceId?: string;
    sessionId?: string;
    agentId?: string;
    taskId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const conditions = [eq(auditLogs.tenantId, tid)];

    if (options?.eventType) {
      conditions.push(eq(auditLogs.eventType, options.eventType));
    }
    if (options?.traceId) {
      conditions.push(eq(auditLogs.traceId, options.traceId));
    }
    if (options?.sessionId) {
      conditions.push(eq(auditLogs.sessionId, options.sessionId));
    }
    if (options?.agentId) {
      conditions.push(eq(auditLogs.agentId, options.agentId));
    }
    if (options?.taskId) {
      conditions.push(eq(auditLogs.taskId, options.taskId));
    }

    return await this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }
}
