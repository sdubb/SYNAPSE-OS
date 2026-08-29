import { z } from "zod";

export const PolicyDecisionTypeSchema = z.enum(["ALLOW", "BLOCK", "REQUIRE_APPROVAL"]);
export type PolicyDecisionType = z.infer<typeof PolicyDecisionTypeSchema>;

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const PolicyRuleOperatorSchema = z.enum([
  "EQUALS",
  "NOT_EQUALS",
  "CONTAINS",
  "NOT_CONTAINS",
  "STARTS_WITH",
  "ENDS_WITH",
  "MATCHES_REGEX",
  "IN",
  "NOT_IN",
  "GREATER_THAN",
  "LESS_THAN",
  "IS_EMPTY",
  "IS_NOT_EMPTY",
  "CIDR_MATCH",
  "GLOB_MATCH",
]);
export type PolicyRuleOperator = z.infer<typeof PolicyRuleOperatorSchema>;

export const PolicyConditionSchema = z.object({
  field: z.string().min(1),
  operator: PolicyRuleOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]).optional(),
});
export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;

export const LogicalOperatorSchema = z.enum(["AND", "OR", "NOT"]);
export type LogicalOperator = z.infer<typeof LogicalOperatorSchema>;

export type ConditionGroup = {
  operator: LogicalOperator;
  conditions: Array<PolicyCondition | ConditionGroup>;
};

export const ConditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    operator: LogicalOperatorSchema,
    conditions: z.array(z.union([PolicyConditionSchema, ConditionGroupSchema])),
  })
);

export const PolicyRuleDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  category: z.enum(["filesystem", "shell", "network", "git", "secrets", "destructive", "custom"]).default("custom"),
  priority: z.number().int().default(100), // Higher number = higher evaluation priority
  target: z.string().default("*"), // Glob pattern e.g., "tool:*", "fs:write", "net:connect"
  conditions: ConditionGroupSchema,
  decision: PolicyDecisionTypeSchema,
  riskLevel: RiskLevelSchema.default("MEDIUM"),
  reason: z.string().min(1),
  remediation: z.string().optional(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type PolicyRuleDefinition = z.infer<typeof PolicyRuleDefinitionSchema>;

export const PolicyConfigSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default("1.0.0"),
  rules: z.array(PolicyRuleDefinitionSchema).default([]),
  defaultDecision: PolicyDecisionTypeSchema.default("REQUIRE_APPROVAL"),
  defaultRiskLevel: RiskLevelSchema.default("MEDIUM"),
  strictMode: z.boolean().default(true), // If true, evaluation errors lead to BLOCK; if false, lead to REQUIRE_APPROVAL
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

export const PolicyExecutionContextSchema = z.object({
  tenantId: z.string().min(1),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  taskId: z.string().optional(),
  workspaceId: z.string().optional(),
  workspaceRoot: z.string().optional(),
  userId: z.string().optional(),
  userRole: z.string().optional(),
  toolName: z.string().min(1),
  action: z.string().min(1), // e.g., "execute_command", "write_file", "read_file", "http_request", "git_push"
  target: z.string().min(1), // e.g. path, command string, URL, git ref, database table
  args: z.record(z.string(), z.unknown()).default({}),
  environment: z.record(z.string(), z.string()).default({}),
  timestamp: z.number().int().default(() => Date.now()),
});
export type PolicyExecutionContext = z.infer<typeof PolicyExecutionContextSchema>;

export const PolicyEvaluationResultSchema = z.object({
  decision: PolicyDecisionTypeSchema,
  riskLevel: RiskLevelSchema,
  allowed: z.boolean(),
  requiresApproval: z.boolean(),
  blocked: z.boolean(),
  reason: z.string(),
  remediation: z.string().optional(),
  matchedRuleId: z.string().optional(),
  matchedRuleName: z.string().optional(),
  matchedCategory: z.string().optional(),
  violations: z.array(z.string()).default([]),
  riskScore: z.number().min(0).max(100),
  evaluatedRulesCount: z.number().int().nonnegative(),
  evaluationDurationMs: z.number().nonnegative(),
  timestamp: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type PolicyEvaluationResult = z.infer<typeof PolicyEvaluationResultSchema>;
