import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, numeric, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    role: varchar("role", { length: 32 }).notNull().default("engineer"),
    mode: varchar("mode", { length: 32 }).notNull().default("supervised"),
    model: jsonb("model").notNull(),
    fallbackModels: jsonb("fallback_models").notNull().default([]),
    systemPrompt: text("system_prompt").notNull().default(""),
    customInstructions: text("custom_instructions"),
    capabilities: jsonb("capabilities").notNull().default({}),
    timeoutSeconds: numeric("timeout_seconds").notNull().default("3600"),
    maxBudgetUsd: numeric("max_budget_usd"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("agents_tenant_id_idx").on(table.tenantId),
    index("agents_role_idx").on(table.role),
  ]
);

export type AgentRecord = typeof agents.$inferSelect;
export type NewAgentRecord = typeof agents.$inferInsert;
