import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    description: text("description"),
    environment: varchar("environment", { length: 32 }).notNull().default("development"),
    isActive: boolean("is_active").notNull().default(true),
    settings: jsonb("settings").notNull().default({}),
    quotas: jsonb("quotas").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workspaces_org_id_idx").on(table.organizationId),
  ]
);

export type WorkspaceRecord = typeof workspaces.$inferSelect;
export type NewWorkspaceRecord = typeof workspaces.$inferInsert;
