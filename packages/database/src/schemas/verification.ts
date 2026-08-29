import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer, bigint, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { tasks } from "./tasks.js";
import { sessions } from "./sessions.js";

export const verificationPlans = pgTable(
  "verification_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    assertions: jsonb("assertions").notNull().default([]),
    requireVerifierAgent: boolean("require_verifier_agent").notNull().default(false),
    verifierAgentPrompt: text("verifier_agent_prompt"),
    maxExecutionTimeMs: integer("max_execution_time_ms").notNull().default(300000),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verification_plans_tenant_id_idx").on(table.tenantId),
    index("verification_plans_task_id_idx").on(table.taskId),
  ]
);

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => verificationPlans.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    workspaceId: uuid("workspace_id"),
    overallVerdict: varchar("overall_verdict", { length: 32 }).notNull().default("INCONCLUSIVE"),
    assertionResults: jsonb("assertion_results").notNull().default([]),
    summary: text("summary"),
    evidenceChainRootHash: varchar("evidence_chain_root_hash", { length: 64 }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("verification_runs_tenant_id_idx").on(table.tenantId),
    index("verification_runs_plan_id_idx").on(table.planId),
    index("verification_runs_task_id_idx").on(table.taskId),
    index("verification_runs_verdict_idx").on(table.overallVerdict),
  ]
);

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    verificationRunId: uuid("verification_run_id").references(() => verificationRuns.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    kind: varchar("kind", { length: 64 }).notNull(),
    label: varchar("label", { length: 256 }).notNull(),
    content: text("content").notNull(),
    contentSha256: varchar("content_sha256", { length: 64 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull().default("text/plain"),
    byteSize: integer("byte_size").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("evidence_tenant_id_idx").on(table.tenantId),
    index("evidence_verification_run_id_idx").on(table.verificationRunId),
    index("evidence_sha256_idx").on(table.contentSha256),
  ]
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id"),
    sessionId: uuid("session_id"),
    taskId: uuid("task_id"),
    name: varchar("name", { length: 256 }).notNull(),
    storagePath: text("storage_path").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull().default("application/octet-stream"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("artifacts_tenant_id_idx").on(table.tenantId),
    index("artifacts_workspace_id_idx").on(table.workspaceId),
    index("artifacts_sha256_idx").on(table.sha256),
  ]
);

export type VerificationPlanRecord = typeof verificationPlans.$inferSelect;
export type NewVerificationPlanRecord = typeof verificationPlans.$inferInsert;
export type VerificationRunRecord = typeof verificationRuns.$inferSelect;
export type NewVerificationRunRecord = typeof verificationRuns.$inferInsert;
export type EvidenceRecord = typeof evidence.$inferSelect;
export type NewEvidenceRecord = typeof evidence.$inferInsert;
export type ArtifactRecordDb = typeof artifacts.$inferSelect;
export type NewArtifactRecordDb = typeof artifacts.$inferInsert;

// ---------------------------------------------------------------------------
// Flat `verifications` table — lightweight record consumed by the REST backend.
// Bridges session-level verification status without requiring full plan/run graph.
// ---------------------------------------------------------------------------
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    agentId: uuid("agent_id"),
    taskId: uuid("task_id"),
    verdict: varchar("verdict", { length: 32 }).notNull().default("PENDING"),
    summary: text("summary"),
    assertionResults: jsonb("assertion_results").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verifications_tenant_id_idx").on(table.tenantId),
    index("verifications_session_id_idx").on(table.sessionId),
    index("verifications_verdict_idx").on(table.verdict),
  ]
);

export type VerificationRecord = typeof verifications.$inferSelect;
export type NewVerificationRecord = typeof verifications.$inferInsert;

