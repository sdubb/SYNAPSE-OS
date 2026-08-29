import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, numeric, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

/**
 * Encrypted provider API key storage.
 * The `encryptedApiKey` field stores the base64-encoded encrypted value.
 * The frontend only ever sees the masked version via the `maskApiKey()` helper.
 */
export const providerKeys = pgTable(
  "provider_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(), // e.g. "anthropic", "openai", "google", "deepseek", "ollama"
    displayName: varchar("display_name", { length: 128 }).notNull(),
    // The actual secret — encrypted at rest with AES-256-GCM via the vault service
    encryptedApiKey: text("encrypted_api_key").notNull(),
    // Optional custom base URL for self-hosted / enterprise gateways
    endpointUrl: text("endpoint_url"),
    // Status: ACTIVE | EXPIRED | MISSING_KEY | ERROR
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    // Last time the key was validated against the provider
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    // Optional metadata like org ID, project ID, region
    metadata: jsonb("metadata").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("provider_keys_tenant_id_idx").on(table.tenantId),
    index("provider_keys_provider_idx").on(table.provider),
  ]
);

/**
 * Registry of available LLM models.
 * Admins can add custom models (e.g. self-hosted Ollama, fine-tuned models).
 * The `enabled` flag controls whether the routing layer will select this model.
 */
export const llmModels = pgTable(
  "llm_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    modelId: varchar("model_id", { length: 128 }).notNull(), // e.g. "claude-3-7-sonnet", "gpt-4o"
    provider: varchar("provider", { length: 64 }).notNull(), // e.g. "anthropic", "openai"
    displayName: varchar("display_name", { length: 256 }).notNull(),
    contextWindow: numeric("context_window").notNull().default("128000"),
    inputPricingPer1M: numeric("input_pricing_per_1m", { precision: 10, scale: 4 }).notNull().default("0"),
    outputPricingPer1M: numeric("output_pricing_per_1m", { precision: 10, scale: 4 }).notNull().default("0"),
    rateLimitRpm: numeric("rate_limit_rpm").notNull().default("1000"),
    rateLimitTpm: numeric("rate_limit_tpm").notNull().default("100000"),
    availability: varchar("availability", { length: 32 }).notNull().default("AVAILABLE"), // AVAILABLE | DEGRADED | RATE_LIMITED
    enabled: boolean("enabled").notNull().default(true),
    capabilities: jsonb("capabilities").notNull().default([]), // e.g. ["vision", "function_calling", "reasoning"]
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("llm_models_tenant_id_idx").on(table.tenantId),
    index("llm_models_provider_idx").on(table.provider),
    index("llm_models_model_id_idx").on(table.modelId),
  ]
);

export type ProviderKeyRecord = typeof providerKeys.$inferSelect;
export type NewProviderKeyRecord = typeof providerKeys.$inferInsert;
export type LLMModelRecord = typeof llmModels.$inferSelect;
export type NewLLMModelRecord = typeof llmModels.$inferInsert;

/**
 * Mask an API key for display — show only first 6 and last 4 chars.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return key.slice(0, 6) + "•".repeat(Math.min(key.length - 10, 20)) + key.slice(-4);
}
