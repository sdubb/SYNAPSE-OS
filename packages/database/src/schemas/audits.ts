import { pgTable, uuid, varchar, jsonb, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    agentId: uuid("agent_id"),
    sessionId: uuid("session_id"),
    taskId: uuid("task_id"),
    workspaceId: uuid("workspace_id"),
    userId: uuid("user_id"),
    traceId: varchar("trace_id", { length: 128 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    ipAddress: varchar("ip_address", { length: 64 }),
    sequence: bigint("sequence", { mode: "number" }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_tenant_id_idx").on(table.tenantId),
    index("audit_logs_event_type_idx").on(table.eventType),
    index("audit_logs_trace_id_idx").on(table.traceId),
    index("audit_logs_timestamp_idx").on(table.timestamp),
    index("audit_logs_session_id_idx").on(table.sessionId),
  ]
);

export type AuditLogRecord = typeof auditLogs.$inferSelect;
export type NewAuditLogRecord = typeof auditLogs.$inferInsert;
