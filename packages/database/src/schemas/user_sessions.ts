import { pgTable, uuid, varchar, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 256 }).notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_sessions_user_id_idx").on(table.userId),
    index("user_sessions_token_idx").on(table.tokenHash),
  ]
);

export type UserSessionRecord = typeof userSessions.$inferSelect;
export type NewUserSessionRecord = typeof userSessions.$inferInsert;
