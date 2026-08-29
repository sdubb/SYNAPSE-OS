import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { policies, type PolicyRecord, type NewPolicyRecord } from "../schemas/policies.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class PolicyRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "PolicyRepository");
    }
    return tenantId;
  }

  async findById(id: string, tenantId?: string): Promise<PolicyRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(policies)
      .where(and(eq(policies.id, id), eq(policies.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: Omit<NewPolicyRecord, "tenantId"> & { tenantId?: string }): Promise<PolicyRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const insertData: NewPolicyRecord = {
      ...data,
      tenantId: tid,
    };
    const results = await this.db.insert(policies).values(insertData).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create policy record");
    return created;
  }

  async update(id: string, data: Partial<NewPolicyRecord>, tenantId?: string): Promise<PolicyRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(policies)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(policies.id, id), eq(policies.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string, tenantId?: string): Promise<boolean> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .delete(policies)
      .where(and(eq(policies.id, id), eq(policies.tenantId, tid)))
      .returning({ id: policies.id });
    return results.length > 0;
  }

  async list(options?: {
    tenantId?: string;
    scope?: string;
    enabledOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PolicyRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(policies.tenantId, tid)];

    if (options?.scope) {
      conditions.push(eq(policies.scope, options.scope));
    }
    if (options?.enabledOnly) {
      conditions.push(eq(policies.enabled, true));
    }

    return await this.db
      .select()
      .from(policies)
      .where(and(...conditions))
      .orderBy(desc(policies.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
