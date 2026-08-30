import { z } from "zod";

// ============================================================
// MCP INTEGRATION (External MCP Server Connections)
// ============================================================

export const McpTransportSchema = z.enum(["stdio", "sse", "streamable-http"]);
export type McpTransport = z.infer<typeof McpTransportSchema>;

export const McpAuthTypeSchema = z.enum(["none", "api_key", "oauth2", "bearer_token"]);
export type McpAuthType = z.infer<typeof McpAuthTypeSchema>;

export const IntegrationStatusSchema = z.enum([
  "registered",
  "connecting",
  "connected",
  "disconnected",
  "error",
  "disabled",
]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const McpIntegrationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(128),
  provider: z.string().min(1).max(128),
  endpoint: z.string().min(1),
  transport: McpTransportSchema.default("sse"),
  authenticationType: McpAuthTypeSchema.default("api_key"),
  capabilities: z.array(z.string()).default([]),
  status: IntegrationStatusSchema.default("registered"),
  healthStatus: z.enum(["healthy", "degraded", "unhealthy", "unknown"]).default("unknown"),
  lastSeenAt: z.string().datetime().optional(),
  errorCount: z.number().int().nonnegative().default(0),
  lastError: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type McpIntegration = z.infer<typeof McpIntegrationSchema>;

// ============================================================
// MCP SERVER TOOLS (Governed SYNAPSE capabilities exposed via MCP)
// ============================================================

export const McpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  annotations: z.object({
    readOnlyHint: z.boolean().default(false),
    destructiveHint: z.boolean().default(false),
    idempotentHint: z.boolean().default(false),
    openWorldHint: z.boolean().default(false),
  }).default({ readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }),
});
export type McpTool = z.infer<typeof McpToolSchema>;

// ============================================================
// AGENT TYPES & EXTERNAL AGENT IDENTITY
// ============================================================

export const AgentTypeSchema = z.enum([
  "CLINE",
  "SYNAPSE_NATIVE",
  "EXTERNAL_MCP",
  "EXTERNAL_API",
  "HUMAN",
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const ExternalAgentIdentitySchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentType: AgentTypeSchema,
  agentProvider: z.string().optional(),
  agentModel: z.string().optional(),
  agentSessionId: z.string().uuid().optional(),
  missionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  runId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
  runtimeId: z.string().uuid().optional(),
  integrationId: z.string().uuid().optional(),
});
export type ExternalAgentIdentity = z.infer<typeof ExternalAgentIdentitySchema>;

// ============================================================
// AGENT HEARTBEAT & HEALTH
// ============================================================

export const AgentHealthStateSchema = z.enum([
  "HEALTHY",
  "DEGRADED",
  "UNRESPONSIVE",
  "TERMINATING",
  "TERMINATED",
]);
export type AgentHealthState = z.infer<typeof AgentHealthStateSchema>;

export const AgentHeartbeatSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  lastHeartbeatAt: z.string().datetime(),
  heartbeatIntervalMs: z.number().int().positive().default(30_000),
  missedHeartbeats: z.number().int().nonnegative().default(0),
  healthState: AgentHealthStateSchema.default("HEALTHY"),
});
export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;

// ============================================================
// AGENT OBSERVABILITY EVENTS
// ============================================================

export const AgentEventTypeSchema = z.enum([
  "agent.connected",
  "agent.disconnected",
  "agent.heartbeat",
  "agent.task.started",
  "agent.task.progress",
  "agent.task.completed",
  "agent.task.failed",
  "agent.tool.requested",
  "agent.tool.allowed",
  "agent.tool.blocked",
  "agent.tool.completed",
  "agent.tool.failed",
  "agent.plan.submitted",
  "agent.plan.rejected",
  "agent.replan.proposed",
  "agent.replan.accepted",
  "agent.replan.rejected",
  "agent.simulation.requested",
  "agent.simulation.completed",
  "agent.escalation.requested",
  "agent.approval.requested",
  "agent.approval.resolved",
  "agent.verification.started",
  "agent.verification.completed",
  "agent.runtime.failed",
  "agent.runtime.recovered",
]);
export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  eventType: AgentEventTypeSchema,
  missionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  runId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
  graphVersion: z.number().int().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

// ============================================================
// EXECUTION TIMELINE
// ============================================================

export const TimelineEntryTypeSchema = z.enum([
  "user_intent",
  "agent_selected",
  "agent_reasoning",
  "plan_submitted",
  "graph_version_created",
  "frontier_updated",
  "tool_requested",
  "governance_decision",
  "approval_decision",
  "actual_execution",
  "evidence_collected",
  "observation_recorded",
  "simulation_run",
  "branch_decision",
  "replan_proposed",
  "workforce_changed",
  "verification_run",
  "final_result",
]);
export type TimelineEntryType = z.infer<typeof TimelineEntryTypeSchema>;

export const TimelineEntrySchema = z.object({
  id: z.string().uuid(),
  missionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: TimelineEntryTypeSchema,
  agentId: z.string().uuid().optional(),
  graphVersion: z.number().int().optional(),
  nodeId: z.string().optional(),
  toolName: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// ============================================================
// AGENT PERFORMANCE METRICS
// ============================================================

export const AgentPerformanceMetricsSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  period: z.enum(["hour", "day", "week", "month", "all"]),
  taskCompletionRate: z.number().min(0).max(1).nullable(),
  toolSuccessRate: z.number().min(0).max(1).nullable(),
  toolFailureRate: z.number().min(0).max(1).nullable(),
  policyRejectionRate: z.number().min(0).max(1).nullable(),
  approvalWaitTimeMs: z.number().nullable(),
  averageTaskDurationMs: z.number().nullable(),
  runtimeFailureRate: z.number().min(0).max(1).nullable(),
  replanFrequency: z.number().nullable(),
  recoverySuccessRate: z.number().min(0).max(1).nullable(),
  verificationPassRate: z.number().min(0).max(1).nullable(),
  humanEscalationRate: z.number().min(0).max(1).nullable(),
  totalTokensUsed: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  averageLatencyMs: z.number().nullable(),
  totalExecutions: z.number().int().nonnegative().default(0),
  computedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentPerformanceMetrics = z.infer<typeof AgentPerformanceMetricsSchema>;

// ============================================================
// PREDICTION VS REALITY
// ============================================================

export const PredictionOutcomeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  missionId: z.string().uuid().optional(),
  simulationId: z.string().uuid().optional(),
  predictedSuccessRate: z.number().min(0).max(1).nullable(),
  actualSuccess: z.boolean().nullable(),
  predictedBlastRadius: z.number().nullable(),
  actualBlastRadius: z.number().nullable(),
  predictedDurationMs: z.number().nullable(),
  actualDurationMs: z.number().nullable(),
  predictedViolations: z.number().int().nullable(),
  actualViolations: z.number().int().nullable(),
  predictionError: z.number().nullable(),
  hasOutcome: z.boolean().default(false),
  computedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type PredictionOutcome = z.infer<typeof PredictionOutcomeSchema>;

// ============================================================
// AGENT BENCHMARK
// ============================================================

export const BenchmarkStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type BenchmarkStatus = z.infer<typeof BenchmarkStatusSchema>;

export const AgentBenchmarkSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(256),
  description: z.string().max(1024).optional(),
  missionDefinition: z.record(z.string(), z.unknown()),
  agentIds: z.array(z.string().uuid()),
  status: BenchmarkStatusSchema.default("pending"),
  results: z.array(z.object({
    agentId: z.string().uuid(),
    completed: z.boolean().default(false),
    durationMs: z.number().nullable(),
    costUsd: z.number().nullable(),
    failures: z.number().int().nonnegative().default(0),
    policyViolations: z.number().int().nonnegative().default(0),
    replans: z.number().int().nonnegative().default(0),
    humanInterventions: z.number().int().nonnegative().default(0),
    verificationQuality: z.number().min(0).max(1).nullable(),
  })).default([]),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentBenchmark = z.infer<typeof AgentBenchmarkSchema>;

// ============================================================
// CHALLENGE / RED-TEAM
// ============================================================

export const ChallengeScenarioSchema = z.enum([
  "misleading_observation",
  "unavailable_dependency",
  "api_timeout",
  "database_lock",
  "tool_failure",
  "malformed_tool_result",
  "conflicting_observation",
  "permission_denial",
  "simulation_prediction_mismatch",
  "stale_graph_version",
  "concurrent_replan",
  "worker_crash",
  "runtime_crash",
]);
export type ChallengeScenario = z.infer<typeof ChallengeScenarioSchema>;

export const ChallengeStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>;

export const AgentChallengeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  scenario: ChallengeScenarioSchema,
  description: z.string().max(2048).optional(),
  status: ChallengeStatusSchema.default("pending"),
  agentResponse: z.record(z.string(), z.unknown()).optional(),
  governanceResponse: z.record(z.string(), z.unknown()).optional(),
  recoveryBehavior: z.string().optional(),
  finalOutcome: z.enum(["passed", "failed", "timeout", "inconclusive"]).nullable(),
  failureClassification: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentChallenge = z.infer<typeof AgentChallengeSchema>;

// ============================================================
// AGENT AUTONOMY SCORE
// ============================================================

export const AgentAutonomyScoreSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  planningReliability: z.number().min(0).max(1).nullable(),
  executionReliability: z.number().min(0).max(1).nullable(),
  recoveryReliability: z.number().min(0).max(1).nullable(),
  governanceCompliance: z.number().min(0).max(1).nullable(),
  verificationQuality: z.number().min(0).max(1).nullable(),
  simulationCalibration: z.number().min(0).max(1).nullable(),
  humanDependency: z.number().min(0).max(1).nullable(),
  costEfficiency: z.number().min(0).max(1).nullable(),
  latencyEfficiency: z.number().min(0).max(1).nullable(),
  hasInsufficientData: z.boolean().default(true),
  computedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type AgentAutonomyScore = z.infer<typeof AgentAutonomyScoreSchema>;

// ============================================================
// DEFECT FINDINGS
// ============================================================

export const DefectSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type DefectSeverity = z.infer<typeof DefectSeveritySchema>;

export const DefectTypeSchema = z.enum([
  "repeated_tool_failure",
  "repeated_policy_block",
  "repeated_agent_retry",
  "increasing_latency",
  "execution_stuck",
  "repeated_replan",
  "graph_oscillation",
  "simulation_contradiction",
  "invalid_plan",
  "unavailable_capability_request",
  "runtime_crash",
  "queue_starvation",
  "worker_lease_churn",
  "orphaned_agent",
  "event_stream_gap",
  "observation_mismatch",
  "unexpected_state_transition",
  "cost_spike",
  "token_spike",
]);
export type DefectType = z.infer<typeof DefectTypeSchema>;

export const DefectFindingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  missionId: z.string().uuid().optional(),
  defectType: DefectTypeSchema,
  severity: DefectSeveritySchema,
  title: z.string().min(1).max(256),
  description: z.string().max(4096),
  evidenceIds: z.array(z.string()).default([]),
  eventIds: z.array(z.string().uuid()).default([]),
  occurrences: z.number().int().nonnegative().default(1),
  causeDetermination: z.string().optional(),
  status: z.enum(["open", "investigating", "resolved", "dismissed"]).default("open"),
  detectedAt: z.string().datetime().default(() => new Date().toISOString()),
  resolvedAt: z.string().datetime().optional(),
});
export type DefectFinding = z.infer<typeof DefectFindingSchema>;

// ============================================================
// LATENCY / BOTTLENECK
// ============================================================

export const LatencyBreakdownSchema = z.object({
  missionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  queueTimeMs: z.number().nullable(),
  agentDecisionTimeMs: z.number().nullable(),
  mcpTransportTimeMs: z.number().nullable(),
  toolAuthorizationTimeMs: z.number().nullable(),
  approvalWaitTimeMs: z.number().nullable(),
  executionTimeMs: z.number().nullable(),
  simulationTimeMs: z.number().nullable(),
  verificationTimeMs: z.number().nullable(),
  persistenceTimeMs: z.number().nullable(),
  totalDurationMs: z.number().nullable(),
  bottleneckPhase: z.string().nullable(),
  computedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type LatencyBreakdown = z.infer<typeof LatencyBreakdownSchema>;
