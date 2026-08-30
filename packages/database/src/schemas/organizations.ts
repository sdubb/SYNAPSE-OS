import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    description: text("description"),
    plan: varchar("plan", { length: 32 }).notNull().default("free"),
    isActive: boolean("is_active").notNull().default(true),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("organizations_slug_idx").on(table.slug),
  ]
);

export type OrganizationRecord = typeof organizations.$inferSelect;
export type NewOrganizationRecord = typeof organizations.$inferInsert;
