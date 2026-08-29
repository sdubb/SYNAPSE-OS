import { eq, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { tenants, type TenantRecord, type NewTenantRecord } from "../schemas/tenants.js";

export class TenantRepository {
  constructor(private readonly db: SynapseDatabase) {}

  async findById(id: string): Promise<TenantRecord | null> {
    const results = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return results[0] ?? null;
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    const results = await this.db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return results[0] ?? null;
  }

  async create(data: NewTenantRecord): Promise<TenantRecord> {
    const results = await this.db.insert(tenants).values(data).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to insert tenant record");
    return created;
  }

  async update(id: string, data: Partial<NewTenantRecord>): Promise<TenantRecord | null> {
    const results = await this.db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db.delete(tenants).where(eq(tenants.id, id)).returning({ id: tenants.id });
    return results.length > 0;
  }

  async list(options?: { limit?: number; offset?: number; activeOnly?: boolean }): Promise<TenantRecord[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    if (options?.activeOnly) {
      return await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.isActive, true))
        .orderBy(desc(tenants.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return await this.db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
