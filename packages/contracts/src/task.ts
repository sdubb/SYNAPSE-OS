import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "backlog",
  "planned",
  "authorized",
  "queued",
  "running",
  "verifying",
  "review",
  "completed",
  "failed",
  "recovery",
  "retry",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "critical", "emergency"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const DependencyTypeSchema = z.enum(["blocks", "requires_success", "parallel_with", "after"]);
export type DependencyType = z.infer<typeof DependencyTypeSchema>;

export const TaskDependencySchema = z.object({
  taskId: z.string().uuid(),
  type: DependencyTypeSchema.default("requires_success"),
});
export type TaskDependency = z.infer<typeof TaskDependencySchema>;

export const RetryPolicySchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  currentRetry: z.number().int().nonnegative().default(0),
  backoffMs: z.number().int().positive().default(5000),
  exponential: z.boolean().default(true),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const TaskExecutionResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number().int().optional(),
  summary: z.string().optional(),
  outputArtifacts: z.array(z.string()).default([]),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
  executionDurationMs: z.number().int().nonnegative().optional(),
});
export type TaskExecutionResult = z.infer<typeof TaskExecutionResultSchema>;

/**
 * Mission: High-level team or multi-task objective
 */
export const MissionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  title: z.string().min(1).max(256),
  objective: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
  constraints: z.array(z.string()).default([]),
  status: z.enum(["draft", "active", "paused", "completed", "failed", "cancelled"]).default("active"),
  taskIds: z.array(z.string().uuid()).default([]),
  policies: z.array(z.string()).default([]),
  budgetUsd: z.number().nonnegative().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Mission = z.infer<typeof MissionSchema>;

/**
 * Task Run: A single execution attempt of a task
 */
export const TaskRunSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  clineSessionId: z.string().optional(),
  runNumber: z.number().int().positive().default(1),
  status: z.enum([
    "queued",
    "starting",
    "running",
    "waiting_approval",
    "paused",
    "recovering",
    "verifying",
    "completed",
    "failed",
    "cancelled",
    "terminated",
  ]).default("queued"),
  startedAt: z.string().datetime().default(() => new Date().toISOString()),
  endedAt: z.string().datetime().optional(),
  tokenUsage: z.object({
    promptTokens: z.number().int().nonnegative().default(0),
    completionTokens: z.number().int().nonnegative().default(0),
    totalCostUsd: z.number().nonnegative().default(0),
  }).default({ promptTokens: 0, completionTokens: 0, totalCostUsd: 0 }),
  verificationId: z.string().uuid().optional(),
  evidenceId: z.string().uuid().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type TaskRun = z.infer<typeof TaskRunSchema>;

/**
 * Universal Synapse Task Schema - open-ended, not locked to any domain.
 */
export const SynapseTaskSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  missionId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
  assignedAgentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  title: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  objective: z.string().default(""),
  context: z.record(z.string(), z.unknown()).default({}),
  constraints: z.array(z.string()).default([]),
  inputs: z.record(z.string(), z.unknown()).default({}),
  expectedOutputs: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  instructions: z.string().min(1),
  status: TaskStatusSchema.default("backlog"),
  priority: TaskPrioritySchema.default("medium"),
  dependencies: z.array(TaskDependencySchema).default([]),
  policyIds: z.array(z.string().uuid()).default([]),
  verificationPlanId: z.string().uuid().optional(),
  retryPolicy: RetryPolicySchema.default({ maxRetries: 3, currentRetry: 0, backoffMs: 5000, exponential: true }),
  currentRunId: z.string().uuid().optional(),
  executionResult: TaskExecutionResultSchema.optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  scheduledAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type SynapseTask = z.infer<typeof SynapseTaskSchema>;

export const CreateTaskRequestSchema = z.object({
  tenantId: z.string().uuid(),
  missionId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
  assignedAgentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  title: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  objective: z.string().optional(),
  context: z.record(z.string(), z.unknown()).default({}),
  constraints: z.array(z.string()).default([]),
  inputs: z.record(z.string(), z.unknown()).default({}),
  expectedOutputs: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  instructions: z.string().min(1),
  priority: TaskPrioritySchema.default("medium"),
  dependencies: z.array(TaskDependencySchema).default([]),
  policyIds: z.array(z.string().uuid()).default([]),
  verificationPlanId: z.string().uuid().optional(),
  retryPolicy: RetryPolicySchema.default({ maxRetries: 3, currentRetry: 0, backoffMs: 5000, exponential: true }),
  tags: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

export const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(4096).optional(),
  objective: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  constraints: z.array(z.string()).optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  expectedOutputs: z.array(z.string()).optional(),
  successCriteria: z.array(z.string()).optional(),
  instructions: z.string().min(1).optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
  dependencies: z.array(TaskDependencySchema).optional(),
  verificationPlanId: z.string().uuid().nullable().optional(),
  executionResult: TaskExecutionResultSchema.optional(),
  tags: z.array(z.string()).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
