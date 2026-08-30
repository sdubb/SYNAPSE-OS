import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),
    keyHash: varchar("key_hash", { length: 256 }).notNull(),
    scopes: jsonb("scopes").notNull().default(["*"]),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_user_id_idx").on(table.userId),
    index("api_keys_org_id_idx").on(table.organizationId),
    index("api_keys_prefix_idx").on(table.keyPrefix),
  ]
);

export type ApiKeyRecord = typeof apiKeys.$inferSelect;
export type NewApiKeyRecord = typeof apiKeys.$inferInsert;
