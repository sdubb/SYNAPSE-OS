import { z } from "zod";
export const SessionStatusSchema = z.enum([
    "initializing",
    "active",
    "paused",
    "awaiting_input",
    "awaiting_approval",
    "completed",
    "aborted",
    "failed",
    "timed_out",
]);
export const SessionModeSchema = z.enum(["interactive", "batch", "scheduled", "simulation", "verification"]);
export const TokenUsageSchema = z.object({
    promptTokens: z.number().int().nonnegative().default(0),
    completionTokens: z.number().int().nonnegative().default(0),
    totalTokens: z.number().int().nonnegative().default(0),
    cacheReadTokens: z.number().int().nonnegative().optional(),
    cacheWriteTokens: z.number().int().nonnegative().optional(),
    estimatedCostUsd: z.number().nonnegative().default(0),
});
export const RuntimeMetadataSchema = z.object({
    runtimeId: z.string().uuid(),
    hostMode: z.enum(["local", "remote", "hub", "sandboxed"]),
    hostname: z.string().optional(),
    pid: z.number().int().optional(),
    nodeVersion: z.string().optional(),
    osPlatform: z.string().optional(),
    workingDirectory: z.string(),
    gitBranch: z.string().optional(),
    gitCommitSha: z.string().optional(),
    environmentVariables: z.record(z.string()).default({}),
});
export const SynapseSessionSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    agentId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    clineSessionId: z.string().min(1),
    workspaceId: z.string().uuid(),
    runtimeId: z.string().uuid(),
    parentSessionId: z.string().uuid().optional(),
    status: SessionStatusSchema.default("initializing"),
    mode: SessionModeSchema.default("interactive"),
    title: z.string().max(256).optional(),
    tokenUsage: TokenUsageSchema.default({}),
    runtimeMetadata: RuntimeMetadataSchema,
    activeCheckpoints: z.array(z.string()).default([]),
    lastCheckpointId: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
    startedAt: z.string().datetime().default(() => new Date().toISOString()),
    endedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
    updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const CreateSessionRequestSchema = z.object({
    tenantId: z.string().uuid(),
    agentId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    workspaceId: z.string().uuid(),
    mode: SessionModeSchema.default("interactive"),
    title: z.string().max(256).optional(),
    initialPrompt: z.string().optional(),
    runtimeMetadata: RuntimeMetadataSchema.partial().optional(),
    metadata: z.record(z.unknown()).default({}),
});
export const UpdateSessionRequestSchema = z.object({
    status: SessionStatusSchema.optional(),
    title: z.string().max(256).optional(),
    tokenUsage: TokenUsageSchema.optional(),
    lastCheckpointId: z.string().optional(),
    endedAt: z.string().datetime().optional(),
    metadata: z.record(z.unknown()).optional(),
});
//# sourceMappingURL=session.js.map