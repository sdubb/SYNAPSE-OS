import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { agents, type AgentRecord, type NewAgentRecord } from "../schemas/agents.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class AgentRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "AgentRepository");
    }
    return tenantId;
  }

  async findById(id: string, tenantId?: string): Promise<AgentRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async findByName(name: string, tenantId?: string): Promise<AgentRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.name, name), eq(agents.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: Omit<NewAgentRecord, "tenantId"> & { tenantId?: string }): Promise<AgentRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const insertData: NewAgentRecord = {
      ...data,
      tenantId: tid,
    };
    const results = await this.db.insert(agents).values(insertData).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create agent record");
    return created;
  }

  async update(id: string, data: Partial<NewAgentRecord>, tenantId?: string): Promise<AgentRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string, tenantId?: string): Promise<boolean> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .delete(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tid)))
      .returning({ id: agents.id });
    return results.length > 0;
  }

  async list(options?: {
    tenantId?: string;
    role?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AgentRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(agents.tenantId, tid)];

    if (options?.role) {
      conditions.push(eq(agents.role, options.role));
    }
    if (options?.activeOnly) {
      conditions.push(eq(agents.isActive, true));
    }

    return await this.db
      .select()
      .from(agents)
      .where(and(...conditions))
      .orderBy(desc(agents.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
