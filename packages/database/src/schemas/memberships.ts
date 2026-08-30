import { pgTable, uuid, varchar, jsonb, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    permissions: jsonb("permissions").notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    invitedBy: uuid("invited_by"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("memberships_user_org_idx").on(table.userId, table.organizationId),
    index("memberships_org_id_idx").on(table.organizationId),
    index("memberships_user_id_idx").on(table.userId),
  ]
);

export type MembershipRecord = typeof memberships.$inferSelect;
export type NewMembershipRecord = typeof memberships.$inferInsert;
