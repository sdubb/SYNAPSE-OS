import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, doublePrecision, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const worldModels = pgTable(
  "world_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("world_models_tenant_id_idx").on(table.tenantId),
  ]
);

export const worldEntities = pgTable(
  "world_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    worldModelId: uuid("world_model_id")
      .notNull()
      .references(() => worldModels.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    properties: jsonb("properties").notNull().default({}),
    state: jsonb("state").notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("world_entities_tenant_id_idx").on(table.tenantId),
    index("world_entities_world_model_id_idx").on(table.worldModelId),
    index("world_entities_type_idx").on(table.type),
  ]
);

export const worldRelationships = pgTable(
  "world_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    worldModelId: uuid("world_model_id")
      .notNull()
      .references(() => worldModels.id, { onDelete: "cascade" }),
    sourceEntityId: uuid("source_entity_id")
      .notNull()
      .references(() => worldEntities.id, { onDelete: "cascade" }),
    targetEntityId: uuid("target_entity_id")
      .notNull()
      .references(() => worldEntities.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    properties: jsonb("properties").notNull().default({}),
    weight: doublePrecision("weight").notNull().default(1.0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("world_relationships_tenant_id_idx").on(table.tenantId),
    index("world_relationships_world_model_id_idx").on(table.worldModelId),
    index("world_relationships_source_idx").on(table.sourceEntityId),
    index("world_relationships_target_idx").on(table.targetEntityId),
  ]
);

export const worldSnapshots = pgTable(
  "world_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    worldModelId: uuid("world_model_id")
      .notNull()
      .references(() => worldModels.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    entityStates: jsonb("entity_states").notNull().default({}),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("world_snapshots_tenant_id_idx").on(table.tenantId),
    index("world_snapshots_world_model_id_idx").on(table.worldModelId),
  ]
);

export type WorldModelRecord = typeof worldModels.$inferSelect;
export type NewWorldModelRecord = typeof worldModels.$inferInsert;
export type WorldEntityRecord = typeof worldEntities.$inferSelect;
export type NewWorldEntityRecord = typeof worldEntities.$inferInsert;
export type WorldRelationshipRecord = typeof worldRelationships.$inferSelect;
export type NewWorldRelationshipRecord = typeof worldRelationships.$inferInsert;
export type WorldSnapshotRecord = typeof worldSnapshots.$inferSelect;
export type NewWorldSnapshotRecord = typeof worldSnapshots.$inferInsert;
