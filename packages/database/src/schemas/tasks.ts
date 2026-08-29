import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { agents } from "./agents.js";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    parentTaskId: uuid("parent_task_id"),
    workspaceId: uuid("workspace_id").notNull(),
    assignedAgentId: uuid("assigned_agent_id").references(() => agents.id, { onDelete: "set null" }),
    teamId: uuid("team_id"),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    instructions: text("instructions").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("backlog"),
    priority: varchar("priority", { length: 32 }).notNull().default("medium"),
    dependencies: jsonb("dependencies").notNull().default([]),
    policyIds: jsonb("policy_ids").notNull().default([]),
    verificationPlanId: uuid("verification_plan_id"),
    retryPolicy: jsonb("retry_policy").notNull().default({
      maxRetries: 3,
      currentRetry: 0,
      backoffMs: 5000,
      exponential: true,
    }),
    executionResult: jsonb("execution_result"),
    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_tenant_id_idx").on(table.tenantId),
    index("tasks_status_idx").on(table.status),
    index("tasks_assigned_agent_idx").on(table.assignedAgentId),
    index("tasks_workspace_idx").on(table.workspaceId),
  ]
);

export type TaskRecord = typeof tasks.$inferSelect;
export type NewTaskRecord = typeof tasks.$inferInsert;
