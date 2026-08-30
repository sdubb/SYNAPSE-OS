import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";
import { workspaces } from "./workspaces.js";

/**
 * Provider Credentials — Encrypted at rest.
 *
 * The `encrypted_secret` column stores the user's LLM provider API key
 * encrypted with a server-side key (AES-256-GCM). The plaintext secret
 * is NEVER returned through any API, WebSocket, audit event, error
 * message, or frontend state.
 *
 * Only the ProviderCredentialResolver may decrypt this value, and only
 * inside the trusted backend runtime when configuring a ClineEngine
 * instance for an authorized mission.
 */
export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),

    // Provider identity
    provider: varchar("provider", { length: 64 }).notNull(), // openrouter, openai, anthropic, etc.
    model: varchar("model", { length: 128 }), // optional default model
    baseUrl: varchar("base_url", { length: 512 }), // optional custom endpoint

    // Encrypted credential — NEVER returned through API
    encryptedSecret: text("encrypted_secret").notNull(),

    // Safe metadata (returned through API, never the secret)
    keyPrefix: varchar("key_prefix", { length: 16 }).notNull(), // sk-or-v1-••••
    status: varchar("status", { length: 32 }).notNull().default("active"), // active, revoked, expired

    // Lifecycle
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    rotatedFromId: uuid("rotated_from_id"), // references previous credential

    // Metadata
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("provider_credentials_user_id_idx").on(table.userId),
    index("provider_credentials_org_id_idx").on(table.organizationId),
    index("provider_credentials_workspace_id_idx").on(table.workspaceId),
    // One active credential per provider per user per workspace (nullable workspace = org-level)
    uniqueIndex("provider_credentials_unique_active_idx").on(
      table.userId,
      table.organizationId,
      table.provider
    ),
  ]
);

export type ProviderCredentialRecord = typeof providerCredentials.$inferSelect;
export type NewProviderCredentialRecord =
  typeof providerCredentials.$inferInsert;
