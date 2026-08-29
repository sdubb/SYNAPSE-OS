import { z } from "zod";

export const PolicyDecisionSchema = z.enum(["ALLOW", "BLOCK", "REQUIRE_APPROVAL"]);
export type PolicyDecision = "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL";

export const PolicyRiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type PolicyRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const PolicyScopeSchema = z.enum([
  "global",
  "tenant",
  "workspace",
  "agent",
  "tool",
  "command",
  "filesystem",
  "network",
]);
export type PolicyScope = z.infer<typeof PolicyScopeSchema>;

export const RuleOperatorSchema = z.enum([
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
]);
export type RuleOperator = z.infer<typeof RuleOperatorSchema>;

export const PolicyRuleConditionSchema = z.object({
  field: z.string(),
  operator: RuleOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())]).optional(),
});
export type PolicyRuleCondition = z.infer<typeof PolicyRuleConditionSchema>;

export const RuleLogicalOperatorSchema = z.enum(["AND", "OR", "NOT"]);
export type RuleLogicalOperator = z.infer<typeof RuleLogicalOperatorSchema>;

export type PolicyRuleGroup = {
  operator: RuleLogicalOperator;
  conditions: Array<PolicyRuleCondition | PolicyRuleGroup>;
};

export const PolicyRuleGroupSchema: z.ZodType<PolicyRuleGroup> = z.lazy(() =>
  z.object({
    operator: RuleLogicalOperatorSchema,
    conditions: z.array(z.union([PolicyRuleConditionSchema, PolicyRuleGroupSchema])),
  })
);

export const PolicyRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  target: z.string(), // e.g. "tool:execute_command", "fs:write_file", "net:connect"
  priority: z.number().int().default(100),
  conditions: PolicyRuleGroupSchema,
  decision: PolicyDecisionSchema,
  riskLevel: PolicyRiskLevelSchema.default("MEDIUM"),
  reason: z.string().optional(),
  remediation: z.string().optional(),
});
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyContextSchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string(), // e.g., "tool_execution", "file_access", "command_run"
  target: z.string(), // e.g., "execute_command:rm", "/etc/passwd"
  parameters: z.record(z.string(), z.unknown()).default({}),
  environment: z.record(z.string(), z.string()).default({}),
  timestamp: z.number().int().default(() => Date.now()),
});
export type PolicyContext = z.infer<typeof PolicyContextSchema>;

export const PolicyEvaluationResultSchema = z.object({
  decision: PolicyDecisionSchema,
  riskLevel: PolicyRiskLevelSchema,
  matchedRuleId: z.string().uuid().optional(),
  matchedRuleName: z.string().optional(),
  reason: z.string(),
  remediation: z.string().optional(),
  evaluationTimestamp: z.number().int().default(() => Date.now()),
  evaluationDurationMs: z.number().int().nonnegative().default(0),
});
export type PolicyEvaluationResult = z.infer<typeof PolicyEvaluationResultSchema>;

export const SynapsePolicySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  scope: PolicyScopeSchema.default("tenant"),
  targetId: z.string().optional(),
  enabled: z.boolean().default(true),
  rules: z.array(PolicyRuleSchema).default([]),
  defaultDecision: PolicyDecisionSchema.default("REQUIRE_APPROVAL"),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type SynapsePolicy = z.infer<typeof SynapsePolicySchema>;

export const CreatePolicyRequestSchema = SynapsePolicySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePolicyRequest = z.infer<typeof CreatePolicyRequestSchema>;
