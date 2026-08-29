import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { sessions } from "./sessions.js";
import { agents } from "./agents.js";
import { users } from "./users.js";

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    taskId: uuid("task_id"),
    workspaceId: uuid("workspace_id"),
    clineSessionId: varchar("cline_session_id", { length: 256 }).notNull(),
    callId: varchar("call_id", { length: 256 }).notNull(),
    toolName: varchar("tool_name", { length: 128 }).notNull(),
    toolParameters: jsonb("tool_parameters").notNull().default({}),
    riskLevel: varchar("risk_level", { length: 32 }).notNull().default("MEDIUM"),
    reason: text("reason"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    timeoutSeconds: integer("timeout_seconds").notNull().default(300),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, { onDelete: "set null" }),
    decision: varchar("decision", { length: 32 }),
    decisionReason: text("decision_reason"),
    modifiedParameters: jsonb("modified_parameters"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("approvals_tenant_id_idx").on(table.tenantId),
    index("approvals_session_id_idx").on(table.sessionId),
    index("approvals_status_idx").on(table.status),
    index("approvals_expires_at_idx").on(table.expiresAt),
  ]
);

export type ApprovalRecord = typeof approvals.$inferSelect;
export type NewApprovalRecord = typeof approvals.$inferInsert;
