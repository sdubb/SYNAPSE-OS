import { z } from "zod";

/**
 * Open-ended Agent Mode. Preset strings provided for convenience,
 * but any custom execution mode string is accepted.
 */
export const AgentModeSchema = z.string().default("supervised");
export type AgentMode = z.infer<typeof AgentModeSchema>;

export const AgentStatusSchema = z.enum([
  "idle",
  "queued",
  "running",
  "paused",
  "blocked_approval",
  "verifying",
  "completed",
  "failed",
  "terminated",
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

/**
 * Open-ended Agent Role. Synapse has NO FIXED AGENT TYPES.
 * Roles are user-configurable strings (e.g., "Financial Analyst", "DevOps Engineer", "Code Reviewer").
 */
export const AgentRoleSchema = z.string().default("general_agent");
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const ToolCapabilitySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  autoApprove: z.boolean().default(false),
  rateLimitPerMinute: z.number().int().positive().optional(),
  parametersSchema: z.record(z.string(), z.unknown()).optional(),
  provider: z.string().optional(),
  requiredSecrets: z.array(z.string()).default([]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
});
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;

export const AgentCapabilitiesSchema = z.object({
  tools: z.array(ToolCapabilitySchema).default([]),
  mcpServers: z.array(z.string()).default([]),
  connectors: z.array(z.string()).default([]),
  customCapabilities: z.array(z.string()).default([]),
  filesystem: z.object({
    read: z.boolean().default(true),
    write: z.boolean().default(false),
    restrictedPaths: z.array(z.string()).default([]),
    allowedPaths: z.array(z.string()).default([]),
  }).default({ read: true, write: false, restrictedPaths: [], allowedPaths: [] }),
  network: z.object({
    allowedHosts: z.array(z.string()).default([]),
    deniedHosts: z.array(z.string()).default([]),
    allowHttp: z.boolean().default(false),
    allowMcp: z.boolean().default(true),
  }).default({ allowedHosts: [], deniedHosts: [], allowHttp: false, allowMcp: true }),
  terminal: z.object({
    allowedCommands: z.array(z.string()).default([]),
    deniedCommands: z.array(z.string()).default([]),
    requireSudo: z.boolean().default(false),
    maxExecutionTimeMs: z.number().int().positive().default(60000),
  }).default({ allowedCommands: [], deniedCommands: [], requireSudo: false, maxExecutionTimeMs: 60000 }),
  subagents: z.object({
    canSpawn: z.boolean().default(false),
    maxDepth: z.number().int().nonnegative().default(1),
    maxChildren: z.number().int().nonnegative().default(5),
  }).default({ canSpawn: false, maxDepth: 1, maxChildren: 5 }),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

export const ModelConfigSchema = z.object({
  provider: z.string(),
  modelId: z.string(),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  apiKeyId: z.string().optional(),
  customEndpoint: z.string().url().optional(),
  parameters: z.record(z.string(), z.unknown()).default({}),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Universal Agent Definition model adhering to capability-driven,
 * user-configurable architecture.
 */
export const AgentDefinitionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  identity: z.object({
    name: z.string().min(1).max(128),
    description: z.string().max(2048).default(""),
    role: z.string().default("general_agent"),
    tags: z.array(z.string()).default([]),
  }),
  instructions: z.object({
    systemPrompt: z.string().default(""),
    objectives: z.array(z.string()).default([]),
    behavioralRules: z.array(z.string()).default([]),
    customInstructions: z.string().optional(),
  }),
  capabilities: AgentCapabilitiesSchema.optional(),
  model: ModelConfigSchema,
  fallbackModels: z.array(ModelConfigSchema).default([]),
  workspace: z.object({
    repositories: z.array(z.string()).default([]),
    directories: z.array(z.string()).default([]),
    environment: z.record(z.string(), z.string()).default({}),
  }).default({ repositories: [], directories: [], environment: {} }),
  permissions: z.object({
    files: z.array(z.string()).default(["read"]),
    shell: z.array(z.string()).default([]),
    network: z.array(z.string()).default([]),
    credentials: z.array(z.string()).default([]),
    productionAccess: z.boolean().default(false),
  }).default({ files: ["read"], shell: [], network: [], credentials: [], productionAccess: false }),
  knowledge: z.object({
    files: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
  }).default({ files: [], databases: [], sources: [] }),
  verification: z.object({
    strategies: z.array(z.string()).default([]),
    approvalRequirements: z.array(z.string()).default([]),
    minConfidence: z.number().min(0).max(1).default(0.8),
  }).default({ strategies: [], approvalRequirements: [], minConfidence: 0.8 }),
  resourceLimits: z.object({
    maxTokens: z.number().int().positive().optional(),
    maxRuntimeSeconds: z.number().int().positive().default(3600),
    maxCostUsd: z.number().nonnegative().optional(),
    maxConcurrency: z.number().int().positive().default(1),
  }).default({ maxRuntimeSeconds: 3600, maxConcurrency: 1 }),
  isTemplate: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

/**
 * Compatible AgentConfig schema
 */
export const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  role: AgentRoleSchema.default("engineer"),
  mode: AgentModeSchema.default("supervised"),
  model: ModelConfigSchema,
  fallbackModels: z.array(ModelConfigSchema).default([]),
  systemPrompt: z.string().default(""),
  customInstructions: z.string().optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
  timeoutSeconds: z.number().int().positive().default(3600),
  maxBudgetUsd: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const CreateAgentRequestSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  role: z.string().default("engineer"),
  mode: z.string().default("supervised"),
  model: ModelConfigSchema,
  fallbackModels: z.array(ModelConfigSchema).default([]),
  systemPrompt: z.string().default(""),
  customInstructions: z.string().optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
  timeoutSeconds: z.number().int().positive().default(3600),
  maxBudgetUsd: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;

export const UpdateAgentRequestSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(1024).optional(),
  role: z.string().optional(),
  mode: z.string().optional(),
  model: ModelConfigSchema.optional(),
  fallbackModels: z.array(ModelConfigSchema).optional(),
  systemPrompt: z.string().optional(),
  customInstructions: z.string().optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
  timeoutSeconds: z.number().int().positive().optional(),
  maxBudgetUsd: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;
