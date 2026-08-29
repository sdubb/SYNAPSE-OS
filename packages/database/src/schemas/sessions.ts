import { pgTable, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { agents } from "./agents.js";
import { tasks } from "./tasks.js";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    clineSessionId: varchar("cline_session_id", { length: 256 }).notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    runtimeId: uuid("runtime_id").notNull(),
    parentSessionId: uuid("parent_session_id"),
    status: varchar("status", { length: 32 }).notNull().default("initializing"),
    mode: varchar("mode", { length: 32 }).notNull().default("interactive"),
    title: varchar("title", { length: 256 }),
    tokenUsage: jsonb("token_usage").notNull().default({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    }),
    runtimeMetadata: jsonb("runtime_metadata").notNull(),
    activeCheckpoints: jsonb("active_checkpoints").notNull().default([]),
    lastCheckpointId: varchar("last_checkpoint_id", { length: 256 }),
    metadata: jsonb("metadata").notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_tenant_id_idx").on(table.tenantId),
    index("sessions_cline_id_idx").on(table.clineSessionId),
    index("sessions_agent_id_idx").on(table.agentId),
    index("sessions_task_id_idx").on(table.taskId),
  ]
);

export type SessionRecord = typeof sessions.$inferSelect;
export type NewSessionRecord = typeof sessions.$inferInsert;
