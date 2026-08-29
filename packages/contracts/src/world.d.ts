import { z } from "zod";
export declare const EntityTypeSchema: z.ZodEnum<["SERVICE", "DATABASE", "QUEUE", "API_ENDPOINT", "INFRASTRUCTURE_RESOURCE", "CODE_MODULE", "DATA_MODEL", "USER_ROLE", "EXTERNAL_SYSTEM", "AGENT_ACTOR"]>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export declare const RelationshipTypeSchema: z.ZodEnum<["DEPENDS_ON", "CALLS", "READS_FROM", "WRITES_TO", "DEPLOYS_TO", "AUTHENTICATES_WITH", "CONTAINS", "MONITORS", "GOVERNS"]>;
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export declare const WorldEntitySchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    worldModelId: z.ZodString;
    type: z.ZodEnum<["SERVICE", "DATABASE", "QUEUE", "API_ENDPOINT", "INFRASTRUCTURE_RESOURCE", "CODE_MODULE", "DATA_MODEL", "USER_ROLE", "EXTERNAL_SYSTEM", "AGENT_ACTOR"]>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    state: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    version: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
    name: string;
    id: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    worldModelId: string;
    properties: Record<string, unknown>;
    state: Record<string, unknown>;
    version: number;
    description?: string | undefined;
}, {
    type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
    name: string;
    id: string;
    tenantId: string;
    worldModelId: string;
    description?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    properties?: Record<string, unknown> | undefined;
    state?: Record<string, unknown> | undefined;
    version?: number | undefined;
}>;
export type WorldEntity = z.infer<typeof WorldEntitySchema>;
export declare const WorldRelationshipSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    worldModelId: z.ZodString;
    sourceEntityId: z.ZodString;
    targetEntityId: z.ZodString;
    type: z.ZodEnum<["DEPENDS_ON", "CALLS", "READS_FROM", "WRITES_TO", "DEPLOYS_TO", "AUTHENTICATES_WITH", "CONTAINS", "MONITORS", "GOVERNS"]>;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    weight: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
    id: string;
    tenantId: string;
    createdAt: string;
    worldModelId: string;
    properties: Record<string, unknown>;
    sourceEntityId: string;
    targetEntityId: string;
    weight: number;
}, {
    type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
    id: string;
    tenantId: string;
    worldModelId: string;
    sourceEntityId: string;
    targetEntityId: string;
    createdAt?: string | undefined;
    properties?: Record<string, unknown> | undefined;
    weight?: number | undefined;
}>;
export type WorldRelationship = z.infer<typeof WorldRelationshipSchema>;
export declare const WorldStateSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    worldModelId: z.ZodString;
    sequence: z.ZodNumber;
    entityStates: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    capturedAt: z.ZodDefault<z.ZodString>;
    checksumSha256: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    sequence: number;
    worldModelId: string;
    entityStates: Record<string, Record<string, unknown>>;
    capturedAt: string;
    checksumSha256: string;
}, {
    id: string;
    tenantId: string;
    sequence: number;
    worldModelId: string;
    entityStates: Record<string, Record<string, unknown>>;
    checksumSha256: string;
    capturedAt?: string | undefined;
}>;
export type WorldStateSnapshot = z.infer<typeof WorldStateSnapshotSchema>;
export declare const GraphProjectionNodeSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["SERVICE", "DATABASE", "QUEUE", "API_ENDPOINT", "INFRASTRUCTURE_RESOURCE", "CODE_MODULE", "DATA_MODEL", "USER_ROLE", "EXTERNAL_SYSTEM", "AGENT_ACTOR"]>;
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
    id: string;
    label: string;
    attributes: Record<string, unknown>;
}, {
    type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
    id: string;
    label: string;
    attributes?: Record<string, unknown> | undefined;
}>;
export type GraphProjectionNode = z.infer<typeof GraphProjectionNodeSchema>;
export declare const GraphProjectionEdgeSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodString;
    target: z.ZodString;
    type: z.ZodEnum<["DEPENDS_ON", "CALLS", "READS_FROM", "WRITES_TO", "DEPLOYS_TO", "AUTHENTICATES_WITH", "CONTAINS", "MONITORS", "GOVERNS"]>;
    weight: z.ZodDefault<z.ZodNumber>;
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
    id: string;
    source: string;
    target: string;
    weight: number;
    attributes: Record<string, unknown>;
}, {
    type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
    id: string;
    source: string;
    target: string;
    weight?: number | undefined;
    attributes?: Record<string, unknown> | undefined;
}>;
export type GraphProjectionEdge = z.infer<typeof GraphProjectionEdgeSchema>;
export declare const GraphProjectionSchema: z.ZodObject<{
    worldModelId: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["SERVICE", "DATABASE", "QUEUE", "API_ENDPOINT", "INFRASTRUCTURE_RESOURCE", "CODE_MODULE", "DATA_MODEL", "USER_ROLE", "EXTERNAL_SYSTEM", "AGENT_ACTOR"]>;
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
        id: string;
        label: string;
        attributes: Record<string, unknown>;
    }, {
        type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
        id: string;
        label: string;
        attributes?: Record<string, unknown> | undefined;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodString;
        target: z.ZodString;
        type: z.ZodEnum<["DEPENDS_ON", "CALLS", "READS_FROM", "WRITES_TO", "DEPLOYS_TO", "AUTHENTICATES_WITH", "CONTAINS", "MONITORS", "GOVERNS"]>;
        weight: z.ZodDefault<z.ZodNumber>;
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
        id: string;
        source: string;
        target: string;
        weight: number;
        attributes: Record<string, unknown>;
    }, {
        type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
        id: string;
        source: string;
        target: string;
        weight?: number | undefined;
        attributes?: Record<string, unknown> | undefined;
    }>, "many">;
    generatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    worldModelId: string;
    nodes: {
        type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
        id: string;
        label: string;
        attributes: Record<string, unknown>;
    }[];
    edges: {
        type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
        id: string;
        source: string;
        target: string;
        weight: number;
        attributes: Record<string, unknown>;
    }[];
    generatedAt: string;
}, {
    worldModelId: string;
    nodes: {
        type: "SERVICE" | "DATABASE" | "QUEUE" | "API_ENDPOINT" | "INFRASTRUCTURE_RESOURCE" | "CODE_MODULE" | "DATA_MODEL" | "USER_ROLE" | "EXTERNAL_SYSTEM" | "AGENT_ACTOR";
        id: string;
        label: string;
        attributes?: Record<string, unknown> | undefined;
    }[];
    edges: {
        type: "CONTAINS" | "DEPENDS_ON" | "CALLS" | "READS_FROM" | "WRITES_TO" | "DEPLOYS_TO" | "AUTHENTICATES_WITH" | "MONITORS" | "GOVERNS";
        id: string;
        source: string;
        target: string;
        weight?: number | undefined;
        attributes?: Record<string, unknown> | undefined;
    }[];
    generatedAt?: string | undefined;
}>;
export type GraphProjection = z.infer<typeof GraphProjectionSchema>;
export declare const WorldModelSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    currentVersion: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    currentVersion: number;
    description?: string | undefined;
}, {
    name: string;
    id: string;
    tenantId: string;
    description?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    currentVersion?: number | undefined;
}>;
export type WorldModel = z.infer<typeof WorldModelSchema>;
//# sourceMappingURL=world.d.ts.map