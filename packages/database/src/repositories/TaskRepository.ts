import { eq, and, desc, inArray } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import { tasks, type TaskRecord, type NewTaskRecord } from "../schemas/tasks.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class TaskRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "TaskRepository");
    }
    return tenantId;
  }

  async findById(id: string, tenantId?: string): Promise<TaskRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: Omit<NewTaskRecord, "tenantId"> & { tenantId?: string }): Promise<TaskRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const insertData: NewTaskRecord = {
      ...data,
      tenantId: tid,
    };
    const results = await this.db.insert(tasks).values(insertData).returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create task record");
    return created;
  }

  async update(id: string, data: Partial<NewTaskRecord>, tenantId?: string): Promise<TaskRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async updateStatus(
    id: string,
    status: string,
    executionResult?: unknown,
    tenantId?: string
  ): Promise<TaskRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const updatePayload: Partial<NewTaskRecord> = {
      status,
      updatedAt: new Date(),
    };
    if (status === "running" && !updatePayload.startedAt) {
      updatePayload.startedAt = new Date();
    }
    if (status === "completed" || status === "failed" || status === "cancelled") {
      updatePayload.completedAt = new Date();
    }
    if (executionResult !== undefined) {
      updatePayload.executionResult = executionResult;
    }

    const results = await this.db
      .update(tasks)
      .set(updatePayload)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string, tenantId?: string): Promise<boolean> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tid)))
      .returning({ id: tasks.id });
    return results.length > 0;
  }

  async list(options?: {
    tenantId?: string;
    workspaceId?: string;
    assignedAgentId?: string;
    status?: string | string[];
    priority?: string;
    parentTaskId?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(tasks.tenantId, tid)];

    if (options?.workspaceId) {
      conditions.push(eq(tasks.workspaceId, options.workspaceId));
    }
    if (options?.assignedAgentId) {
      conditions.push(eq(tasks.assignedAgentId, options.assignedAgentId));
    }
    if (options?.status) {
      if (Array.isArray(options.status)) {
        conditions.push(inArray(tasks.status, options.status));
      } else {
        conditions.push(eq(tasks.status, options.status));
      }
    }
    if (options?.priority) {
      conditions.push(eq(tasks.priority, options.priority));
    }
    if (options?.parentTaskId) {
      conditions.push(eq(tasks.parentTaskId, options.parentTaskId));
    }

    return await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
