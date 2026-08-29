import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import {
  simulationScenarios,
  simulationRuns,
  type SimulationScenarioRecord,
  type NewSimulationScenarioRecord,
  type SimulationRunRecord,
  type NewSimulationRunRecord,
} from "../schemas/simulations.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class SimulationRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "SimulationRepository");
    }
    return tenantId;
  }

  // ---------------------------------------------------------------------------
  // Flat API used by AppController (list / findById / create)
  // These map onto simulationScenarios — scenarios are the top-level entity.
  // ---------------------------------------------------------------------------

  /**
   * List simulation scenarios for a tenant.
   * AppController calls this as `list({ tenantId })`.
   */
  async list(options?: {
    tenantId?: string;
    worldModelId?: string;
    limit?: number;
    offset?: number;
  }): Promise<SimulationScenarioRecord[]> {
    return this.listScenarios(options);
  }

  /**
   * Find a simulation scenario by id.
   * AppController calls this as `findById(id, tenantId)`.
   */
  async findById(id: string, tenantId?: string): Promise<SimulationScenarioRecord | null> {
    return this.findScenarioById(id, tenantId);
  }

  /**
   * Create a simulation scenario.
   * AppController calls this as `create({ name, status, ...data, tenantId })`.
   * The `status` field from the controller is ignored at scenario level (scenarios
   * don't carry a status column; runs do). Extra unknown fields are dropped safely.
   */
  async create(
    data: Omit<NewSimulationScenarioRecord, "tenantId"> & { tenantId?: string; status?: string }
  ): Promise<SimulationScenarioRecord> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status: _ignored, ...rest } = data;
    return this.createScenario(rest);
  }

  // ---------------------------------------------------------------------------
  // Scenarios
  // ---------------------------------------------------------------------------

  async createScenario(
    data: Omit<NewSimulationScenarioRecord, "tenantId"> & { tenantId?: string }
  ): Promise<SimulationScenarioRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(simulationScenarios)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create simulation scenario");
    return created;
  }

  async findScenarioById(id: string, tenantId?: string): Promise<SimulationScenarioRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(simulationScenarios)
      .where(and(eq(simulationScenarios.id, id), eq(simulationScenarios.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async listScenarios(options?: {
    tenantId?: string;
    worldModelId?: string;
    limit?: number;
    offset?: number;
  }): Promise<SimulationScenarioRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(simulationScenarios.tenantId, tid)];

    if (options?.worldModelId) {
      conditions.push(eq(simulationScenarios.worldModelId, options.worldModelId));
    }

    return await this.db
      .select()
      .from(simulationScenarios)
      .where(and(...conditions))
      .orderBy(desc(simulationScenarios.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // ---------------------------------------------------------------------------
  // Simulation Runs
  // ---------------------------------------------------------------------------

  async createRun(
    data: Omit<NewSimulationRunRecord, "tenantId"> & { tenantId?: string }
  ): Promise<SimulationRunRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(simulationRuns)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create simulation run");
    return created;
  }

  async findRunById(id: string, tenantId?: string): Promise<SimulationRunRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(simulationRuns)
      .where(and(eq(simulationRuns.id, id), eq(simulationRuns.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async updateRunProgress(
    id: string,
    data: {
      currentTick: number;
      currentVirtualTimeMs: number;
      diffHistory?: unknown;
    },
    tenantId?: string
  ): Promise<SimulationRunRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const payload: Partial<NewSimulationRunRecord> = {
      currentTick: data.currentTick,
      currentVirtualTimeMs: data.currentVirtualTimeMs,
    };
    if (data.diffHistory !== undefined) {
      payload.diffHistory = data.diffHistory;
    }

    const results = await this.db
      .update(simulationRuns)
      .set(payload)
      .where(and(eq(simulationRuns.id, id), eq(simulationRuns.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async completeRun(
    id: string,
    data: {
      status: "completed" | "failed" | "aborted";
      comparativeResult?: unknown;
    },
    tenantId?: string
  ): Promise<SimulationRunRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(simulationRuns)
      .set({
        status: data.status,
        comparativeResult: data.comparativeResult,
        completedAt: new Date(),
      })
      .where(and(eq(simulationRuns.id, id), eq(simulationRuns.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async listRuns(options?: {
    tenantId?: string;
    scenarioId?: string;
    worldModelId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SimulationRunRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(simulationRuns.tenantId, tid)];

    if (options?.scenarioId) {
      conditions.push(eq(simulationRuns.scenarioId, options.scenarioId));
    }
    if (options?.worldModelId) {
      conditions.push(eq(simulationRuns.worldModelId, options.worldModelId));
    }
    if (options?.status) {
      conditions.push(eq(simulationRuns.status, options.status));
    }

    return await this.db
      .select()
      .from(simulationRuns)
      .where(and(...conditions))
      .orderBy(desc(simulationRuns.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
