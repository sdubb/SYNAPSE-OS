import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  plan: varchar("plan", { length: 32 }).notNull().default("enterprise"),
  isActive: boolean("is_active").notNull().default(true),
  quotas: jsonb("quotas").notNull().default({
    maxConcurrentSessions: 20,
    maxActiveAgents: 50,
    maxDailyTokenSpendUsd: 500,
    maxRequestsPerMinute: 600,
    maxStorageBytes: 53687091200,
  }),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantRecord = typeof tenants.$inferSelect;
export type NewTenantRecord = typeof tenants.$inferInsert;
