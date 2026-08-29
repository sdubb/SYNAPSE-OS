import { z } from "zod";

export const GraphNodeStateSchema = z.enum([
  "CREATED",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "BLOCKED",
  "PAUSED",
  "FAILED",
  "VERIFYING",
  "COMPLETED",
  "TERMINATED"
]);
export type GraphNodeState = z.infer<typeof GraphNodeStateSchema>;

export const GraphNodeTypeSchema = z.enum([
  "ACTION",
  "CONDITION",
  "BRANCH",
  "MERGE",
  "RETRY",
  "FALLBACK",
  "APPROVAL",
  "ESCALATION",
  "VERIFICATION",
  "END"
]);
export type GraphNodeType = z.infer<typeof GraphNodeTypeSchema>;

export const PlanRetryPolicySchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  backoffMs: z.number().int().positive().default(5000),
  maxBackoffMs: z.number().int().positive().default(60000),
  retryOnErrors: z.array(z.string()).default([]),
});
export type PlanRetryPolicy = z.infer<typeof PlanRetryPolicySchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: GraphNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  
  action: z.string().optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  expectedOutcome: z.string().optional(),
  
  successCondition: z.string().optional(),
  failureCondition: z.string().optional(),
  
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  requiredApproval: z.boolean().optional(),
  simulationRequired: z.boolean().optional(),
  verificationRequired: z.boolean().optional(),
  
  retryPolicy: PlanRetryPolicySchema.optional(),
  fallbackNodeId: z.string().optional(),
  escalationNodeId: z.string().optional(),
  
  timeout: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().optional(),
  
  environment: z.record(z.string(), z.string()).optional(),
  workspace: z.string().optional(),
  agentSelector: z.record(z.string(), z.string()).optional(),

  state: GraphNodeStateSchema.default("CREATED"),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  output: z.unknown().optional(),
  attempts: z.number().int().nonnegative().default(0),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(),
  priority: z.number().int().default(0),
  reason: z.string().optional(),
  maxTraversals: z.number().int().positive().optional(),
  traversalCount: z.number().int().nonnegative().default(0),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const ExecutionGraphSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  missionId: z.string(),
  taskId: z.string().optional(),
  version: z.number().int().positive(),
  
  nodes: z.array(GraphNodeSchema).default([]),
  edges: z.array(GraphEdgeSchema).default([]),
  
  objective: z.string(),
  risk: z.record(z.string(), z.unknown()).default({}),
  approvalPoints: z.array(z.string()).default([]),
  escalationPoints: z.array(z.string()).default([]),
  verificationPlan: z.array(z.string()).default([]),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExecutionGraph = z.infer<typeof ExecutionGraphSchema>;

export const PlanVersionSchema = z.object({
  version: z.number().int().positive(),
  graphId: z.string(),
  createdAt: z.string().datetime(),
  reason: z.string(),
});
export type PlanVersion = z.infer<typeof PlanVersionSchema>;

export const EscalationLevelSchema = z.enum([
  "LEVEL_1",
  "LEVEL_2",
  "LEVEL_3",
  "LEVEL_4",
]);
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;

export const EscalationRequestSchema = z.object({
  id: z.string(),
  graphId: z.string(),
  nodeId: z.string(),
  level: EscalationLevelSchema,
  reason: z.string(),
  context: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["PENDING", "RESOLVED", "REJECTED"]).default("PENDING"),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolvedByUserId: z.string().optional(),
});
export type EscalationRequest = z.infer<typeof EscalationRequestSchema>;
