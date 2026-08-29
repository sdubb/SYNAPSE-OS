import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { sessions, type SessionRecord, type NewSessionRecord } from "../schemas/sessions.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class SessionRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "SessionRepository");
    }
    return tenantId;
  }

  async findById(id: string, tenantId?: string): Promise<SessionRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async findByClineSessionId(clineSessionId: string, tenantId?: string): Promise<SessionRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.clineSessionId, clineSessionId), eq(sessions.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: Omit<NewSessionRecord, "tenantId"> & { tenantId?: string }): Promise<SessionRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const insertData: NewSessionRecord = {
      ...data,
      tenantId: tid,
    };
    const results = await this.db.insert(sessions).values(insertData).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create session record");
    return created;
  }

  async update(id: string, data: Partial<NewSessionRecord>, tenantId?: string): Promise<SessionRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(sessions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(sessions.id, id), eq(sessions.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async updateStatus(id: string, status: string, tenantId?: string): Promise<SessionRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const payload: Partial<NewSessionRecord> = {
      status,
      updatedAt: new Date(),
    };
    if (status === "completed" || status === "aborted" || status === "failed" || status === "timed_out") {
      payload.endedAt = new Date();
    }
    const results = await this.db
      .update(sessions)
      .set(payload)
      .where(and(eq(sessions.id, id), eq(sessions.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async updateTokenUsage(id: string, tokenUsage: unknown, tenantId?: string): Promise<SessionRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(sessions)
      .set({ tokenUsage, updatedAt: new Date() })
      .where(and(eq(sessions.id, id), eq(sessions.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async addCheckpoint(id: string, checkpointId: string, tenantId?: string): Promise<SessionRecord | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) return null;

    const currentCheckpoints = (existing.activeCheckpoints as string[]) || [];
    if (!currentCheckpoints.includes(checkpointId)) {
      currentCheckpoints.push(checkpointId);
    }

    return await this.update(
      id,
      {
        activeCheckpoints: currentCheckpoints,
        lastCheckpointId: checkpointId,
      },
      tenantId
    );
  }

  async list(options?: {
    tenantId?: string;
    agentId?: string;
    taskId?: string;
    workspaceId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(sessions.tenantId, tid)];

    if (options?.agentId) {
      conditions.push(eq(sessions.agentId, options.agentId));
    }
    if (options?.taskId) {
      conditions.push(eq(sessions.taskId, options.taskId));
    }
    if (options?.workspaceId) {
      conditions.push(eq(sessions.workspaceId, options.workspaceId));
    }
    if (options?.status) {
      conditions.push(eq(sessions.status, options.status));
    }

    return await this.db
      .select()
      .from(sessions)
      .where(and(...conditions))
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
