import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import {
  worldModels,
  worldEntities,
  worldRelationships,
  worldSnapshots,
  type WorldModelRecord,
  type NewWorldModelRecord,
  type WorldEntityRecord,
  type NewWorldEntityRecord,
  type WorldRelationshipRecord,
  type NewWorldRelationshipRecord,
  type WorldSnapshotRecord,
  type NewWorldSnapshotRecord,
} from "../schemas/worlds.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class WorldRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "WorldRepository");
    }
    return tenantId;
  }

  // ---------------------------------------------------------------------------
  // World Models
  // ---------------------------------------------------------------------------

  async createWorldModel(
    data: Omit<NewWorldModelRecord, "tenantId"> & { tenantId?: string }
  ): Promise<WorldModelRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(worldModels)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create world model");
    return created;
  }

  async findWorldModelById(id: string, tenantId?: string): Promise<WorldModelRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(worldModels)
      .where(and(eq(worldModels.id, id), eq(worldModels.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async listWorldModels(options?: {
    tenantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorldModelRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    return await this.db
      .select()
      .from(worldModels)
      .where(eq(worldModels.tenantId, tid))
      .orderBy(desc(worldModels.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Entities — AppController calls listEntities({tenantId}) and createEntity()
  // ---------------------------------------------------------------------------

  /**
   * List all entities for a tenant. Optionally filter by worldModelId.
   * AppController calls this as `listEntities({ tenantId })`.
   */
  async listEntities(options?: {
    tenantId?: string;
    worldModelId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorldEntityRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const conditions = [eq(worldEntities.tenantId, tid)];

    if (options?.worldModelId) {
      conditions.push(eq(worldEntities.worldModelId, options.worldModelId));
    }
    if (options?.type) {
      conditions.push(eq(worldEntities.type, options.type));
    }

    return await this.db
      .select()
      .from(worldEntities)
      .where(and(...conditions))
      .orderBy(desc(worldEntities.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);
  }

  /**
   * Create (or insert) a new world entity.
   * AppController calls this as `createEntity(data)`.
   */
  async createEntity(
    data: Omit<NewWorldEntityRecord, "tenantId"> & { tenantId?: string }
  ): Promise<WorldEntityRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(worldEntities)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create world entity");
    return created;
  }

  /**
   * @deprecated Use createEntity() instead.
   * Kept for backwards compatibility with engine packages.
   */
  async upsertEntity(
    data: Omit<NewWorldEntityRecord, "tenantId"> & { tenantId?: string }
  ): Promise<WorldEntityRecord> {
    return this.createEntity(data);
  }

  // ---------------------------------------------------------------------------
  // Relationships — AppController calls listRelationships({tenantId})
  // ---------------------------------------------------------------------------

  /**
   * List all relationships for a tenant. Optionally filter by worldModelId.
   * AppController calls this as `listRelationships({ tenantId })`.
   */
  async listRelationships(options?: {
    tenantId?: string;
    worldModelId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorldRelationshipRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const conditions = [eq(worldRelationships.tenantId, tid)];

    if (options?.worldModelId) {
      conditions.push(eq(worldRelationships.worldModelId, options.worldModelId));
    }
    if (options?.type) {
      conditions.push(eq(worldRelationships.type, options.type));
    }

    return await this.db
      .select()
      .from(worldRelationships)
      .where(and(...conditions))
      .orderBy(desc(worldRelationships.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);
  }

  async createRelationship(
    data: Omit<NewWorldRelationshipRecord, "tenantId"> & { tenantId?: string }
  ): Promise<WorldRelationshipRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(worldRelationships)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create world relationship");
    return created;
  }

  // ---------------------------------------------------------------------------
  // Snapshots
  // ---------------------------------------------------------------------------

  async recordSnapshot(
    data: Omit<NewWorldSnapshotRecord, "tenantId"> & { tenantId?: string }
  ): Promise<WorldSnapshotRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(worldSnapshots)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to record world snapshot");
    return created;
  }

  async getLatestSnapshot(worldModelId: string, tenantId?: string): Promise<WorldSnapshotRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(worldSnapshots)
      .where(and(eq(worldSnapshots.worldModelId, worldModelId), eq(worldSnapshots.tenantId, tid)))
      .orderBy(desc(worldSnapshots.sequence))
      .limit(1);
    return results[0] ?? null;
  }
}
