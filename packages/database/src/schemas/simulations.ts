import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { worldModels } from "./worlds.js";

export const simulationScenarios = pgTable(
  "simulation_scenarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    worldModelId: uuid("world_model_id")
      .notNull()
      .references(() => worldModels.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    baseSnapshotId: uuid("base_snapshot_id"),
    actions: jsonb("actions").notNull().default([]),
    durationVirtualMs: integer("duration_virtual_ms").notNull().default(3600000),
    tickIntervalMs: integer("tick_interval_ms").notNull().default(1000),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("simulation_scenarios_tenant_id_idx").on(table.tenantId),
    index("simulation_scenarios_world_model_id_idx").on(table.worldModelId),
  ]
);

export const simulationRuns = pgTable(
  "simulation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => simulationScenarios.id, { onDelete: "cascade" }),
    worldModelId: uuid("world_model_id")
      .notNull()
      .references(() => worldModels.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    currentTick: integer("current_tick").notNull().default(0),
    currentVirtualTimeMs: integer("current_virtual_time_ms").notNull().default(0),
    diffHistory: jsonb("diff_history").notNull().default([]),
    comparativeResult: jsonb("comparative_result"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("simulation_runs_tenant_id_idx").on(table.tenantId),
    index("simulation_runs_scenario_id_idx").on(table.scenarioId),
    index("simulation_runs_status_idx").on(table.status),
  ]
);

export type SimulationScenarioRecord = typeof simulationScenarios.$inferSelect;
export type NewSimulationScenarioRecord = typeof simulationScenarios.$inferInsert;
export type SimulationRunRecord = typeof simulationRuns.$inferSelect;
export type NewSimulationRunRecord = typeof simulationRuns.$inferInsert;
