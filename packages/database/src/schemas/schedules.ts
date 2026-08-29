import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { agents } from "./agents.js";

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    cronExpression: varchar("cron_expression", { length: 128 }).notNull(),
    prompt: text("prompt").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    maxRuns: integer("max_runs"),
    currentRunCount: integer("current_run_count").notNull().default(0),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("schedules_tenant_id_idx").on(table.tenantId),
    index("schedules_enabled_idx").on(table.enabled),
    index("schedules_next_run_idx").on(table.nextRunAt),
  ]
);

export const scheduleRuns = pgTable(
  "schedule_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id"),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("schedule_runs_tenant_id_idx").on(table.tenantId),
    index("schedule_runs_schedule_id_idx").on(table.scheduleId),
    index("schedule_runs_status_idx").on(table.status),
  ]
);

export type ScheduleRecord = typeof schedules.$inferSelect;
export type NewScheduleRecord = typeof schedules.$inferInsert;
export type ScheduleRunRecord = typeof scheduleRuns.$inferSelect;
export type NewScheduleRunRecord = typeof scheduleRuns.$inferInsert;
