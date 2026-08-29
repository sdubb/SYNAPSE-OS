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
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionModeSchema = z.enum(["interactive", "batch", "scheduled", "simulation", "verification"]);
export type SessionMode = z.infer<typeof SessionModeSchema>;

export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative().default(0),
  completionTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().default(0),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().default(0),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

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
  environmentVariables: z.record(z.string(), z.string()).default({}),
});
export type RuntimeMetadata = z.infer<typeof RuntimeMetadataSchema>;

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
  tokenUsage: TokenUsageSchema.default({ promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }),
  runtimeMetadata: RuntimeMetadataSchema,
  activeCheckpoints: z.array(z.string()).default([]),
  lastCheckpointId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  startedAt: z.string().datetime().default(() => new Date().toISOString()),
  endedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type SynapseSession = z.infer<typeof SynapseSessionSchema>;

export const CreateSessionRequestSchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
  mode: SessionModeSchema.default("interactive"),
  title: z.string().max(256).optional(),
  initialPrompt: z.string().optional(),
  runtimeMetadata: RuntimeMetadataSchema.partial().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const UpdateSessionRequestSchema = z.object({
  status: SessionStatusSchema.optional(),
  title: z.string().max(256).optional(),
  tokenUsage: TokenUsageSchema.optional(),
  lastCheckpointId: z.string().optional(),
  endedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;
