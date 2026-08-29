import { z } from "zod";
export const EntityTypeSchema = z.enum([
    "SERVICE",
    "DATABASE",
    "QUEUE",
    "API_ENDPOINT",
    "INFRASTRUCTURE_RESOURCE",
    "CODE_MODULE",
    "DATA_MODEL",
    "USER_ROLE",
    "EXTERNAL_SYSTEM",
    "AGENT_ACTOR",
]);
export const RelationshipTypeSchema = z.enum([
    "DEPENDS_ON",
    "CALLS",
    "READS_FROM",
    "WRITES_TO",
    "DEPLOYS_TO",
    "AUTHENTICATES_WITH",
    "CONTAINS",
    "MONITORS",
    "GOVERNS",
]);
export const WorldEntitySchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    worldModelId: z.string().uuid(),
    type: EntityTypeSchema,
    name: z.string().min(1).max(256),
    description: z.string().max(1024).optional(),
    properties: z.record(z.unknown()).default({}),
    state: z.record(z.unknown()).default({}),
    version: z.number().int().positive().default(1),
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
    updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const WorldRelationshipSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    worldModelId: z.string().uuid(),
    sourceEntityId: z.string().uuid(),
    targetEntityId: z.string().uuid(),
    type: RelationshipTypeSchema,
    properties: z.record(z.unknown()).default({}),
    weight: z.number().default(1.0),
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const WorldStateSnapshotSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    worldModelId: z.string().uuid(),
    sequence: z.number().int().nonnegative(),
    entityStates: z.record(z.record(z.unknown())), // entityId -> state map
    capturedAt: z.string().datetime().default(() => new Date().toISOString()),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const GraphProjectionNodeSchema = z.object({
    id: z.string().uuid(),
    label: z.string(),
    type: EntityTypeSchema,
    attributes: z.record(z.unknown()).default({}),
});
export const GraphProjectionEdgeSchema = z.object({
    id: z.string().uuid(),
    source: z.string().uuid(),
    target: z.string().uuid(),
    type: RelationshipTypeSchema,
    weight: z.number().default(1.0),
    attributes: z.record(z.unknown()).default({}),
});
export const GraphProjectionSchema = z.object({
    worldModelId: z.string().uuid(),
    nodes: z.array(GraphProjectionNodeSchema),
    edges: z.array(GraphProjectionEdgeSchema),
    generatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const WorldModelSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string().min(1).max(256),
    description: z.string().max(2048).optional(),
    currentVersion: z.number().int().positive().default(1),
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
    updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
//# sourceMappingURL=world.js.map