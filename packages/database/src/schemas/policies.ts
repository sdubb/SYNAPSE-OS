import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const policies = pgTable(
  "policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    scope: varchar("scope", { length: 32 }).notNull().default("tenant"),
    targetId: varchar("target_id", { length: 256 }),
    enabled: boolean("enabled").notNull().default(true),
    rules: jsonb("rules").notNull().default([]),
    defaultDecision: varchar("default_decision", { length: 32 }).notNull().default("REQUIRE_APPROVAL"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("policies_tenant_id_idx").on(table.tenantId),
    index("policies_scope_idx").on(table.scope),
  ]
);

export type PolicyRecord = typeof policies.$inferSelect;
export type NewPolicyRecord = typeof policies.$inferInsert;
