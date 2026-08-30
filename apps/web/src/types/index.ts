/**
 * SYNAPSE OS Operator Frontend — Type Definitions
 * Aligned with @synapse/contracts Zod schemas.
 * ZERO mock data. All types represent real backend entities.
 */

// ============================================================
// Core Enums
// ============================================================

export type GraphNodeState =
  | 'CREATED' | 'QUEUED' | 'RUNNING' | 'WAITING' | 'BLOCKED'
  | 'PAUSED' | 'FAILED' | 'VERIFYING' | 'COMPLETED' | 'TERMINATED';

export type GraphNodeType =
  | 'ACTION' | 'CONDITION' | 'BRANCH' | 'MERGE' | 'RETRY'
  | 'FALLBACK' | 'APPROVAL' | 'ESCALATION' | 'VERIFICATION' | 'END';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ApprovalStatus =
  | 'pending' | 'approved' | 'rejected' | 'timed_out'
  | 'auto_approved' | 'cancelled' | 'PENDING' | 'APPROVED'
  | 'REJECTED' | 'TIMED_OUT' | 'AUTO_APPROVED' | 'CANCELLED';

export type EscalationLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';
export type EscalationStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

export type SessionStatus =
  | 'initializing' | 'active' | 'paused' | 'awaiting_input'
  | 'awaiting_approval' | 'completed' | 'aborted' | 'failed' | 'timed_out';

export type TaskStatus =
  | 'DRAFT' | 'UNDERSTANDING' | 'PLANNING' | 'AWAITING_CLARIFICATION'
  | 'AWAITING_APPROVAL' | 'QUEUED' | 'EXECUTING' | 'PAUSED' | 'VERIFYING'
  | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'BLOCKED' | 'RETRY'
  | 'backlog' | 'planned' | 'authorized' | 'running' | 'verifying'
  | 'review' | 'completed' | 'failed' | 'recovery' | 'cancelled' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  | 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';

export type VerificationVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'SKIPPED';

export type SimulationStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';

// ============================================================
// Execution Graph
// ============================================================

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  title: string;
  description?: string;
  action?: string;
  inputs?: Record<string, unknown>;
  expectedOutcome?: string;
  successCondition?: string;
  failureCondition?: string;
  riskLevel?: RiskLevel;
  requiredCapabilities?: string[];
  requiredApproval?: boolean;
  simulationRequired?: boolean;
  verificationRequired?: boolean;
  state: GraphNodeState;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: unknown;
  attempts: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
  priority: number;
  reason?: string;
  traversalCount: number;
}

export interface ExecutionGraph {
  id: string;
  tenantId: string;
  missionId: string;
  taskId?: string;
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  objective: string;
  risk: Record<string, unknown>;
  approvalPoints: string[];
  escalationPoints: string[];
  verificationPlan: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersion {
  version: number;
  graphId: string;
  createdAt: string;
  reason: string;
}

// ============================================================
// Escalation
// ============================================================

export interface EscalationRequest {
  id: string;
  graphId: string;
  nodeId: string;
  level: EscalationLevel;
  reason: string;
  context: Record<string, unknown>;
  status: EscalationStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
}

// ============================================================
// Session / Run
// ============================================================

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface RuntimeMetadata {
  runtimeId: string;
  hostMode: 'local' | 'remote' | 'hub' | 'sandboxed';
  hostname?: string;
  pid?: number;
  nodeVersion?: string;
  osPlatform?: string;
  workingDirectory: string;
  gitBranch?: string;
  gitCommitSha?: string;
  environmentVariables: Record<string, string>;
}

export interface SynapseSession {
  id: string;
  tenantId: string;
  agentId: string;
  taskId?: string;
  clineSessionId: string;
  workspaceId: string;
  runtimeId: string;
  status: SessionStatus;
  title?: string;
  tokenUsage: TokenUsage;
  runtimeMetadata: RuntimeMetadata;
  activeCheckpoints: string[];
  metadata: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Task
// ============================================================

export interface TaskDependency {
  taskId: string;
  type: 'blocks' | 'requires_success' | 'parallel_with' | 'after';
}

export interface SynapseTask {
  id: string;
  tenantId: string;
  missionId?: string;
  workspaceId: string;
  assignedAgentId?: string;
  teamId?: string;
  title: string;
  description?: string;
  objective: string;
  instructions: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: TaskDependency[];
  successCriteria: string[];
  expectedOutputs: string[];
  tags: string[];
  currentRunId?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Agent
// ============================================================

export interface AgentDefinition {
  id: string;
  tenantId: string;
  identity: {
    name: string;
    description: string;
    role: string;
    tags: string[];
  };
  instructions: {
    systemPrompt: string;
    objectives: string[];
    behavioralRules: string[];
  };
  model: {
    provider: string;
    modelId: string;
    temperature: number;
  };
  permissions: {
    files: string[];
    shell: string[];
    network: string[];
    productionAccess: boolean;
  };
  resourceLimits: {
    maxRuntimeSeconds: number;
    maxCostUsd?: number;
    maxConcurrency: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Approval
// ============================================================

export interface ToolApprovalRequest {
  id: string;
  tenantId: string;
  agentId: string;
  missionId?: string;
  taskId?: string;
  runId?: string;
  sessionId: string;
  workspaceId?: string;
  clineSessionId: string;
  callId: string;
  toolName: string;
  toolParameters: Record<string, unknown>;
  riskLevel: RiskLevel;
  reason?: string;
  status: ApprovalStatus;
  timeoutSeconds: number;
  expiresAt: string;
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================
// Audit
// ============================================================

export interface AuditRecord {
  id: string;
  eventId: string;
  timestamp: string;
  actor: string;
  agent?: string;
  mission?: string;
  run?: string;
  graphVersion?: number;
  tool?: string;
  result?: string;
  eventType: string;
  payload: Record<string, unknown>;
  hash: string;
  previousHash: string;
  sequence: number;
}

// ============================================================
// Simulation
// ============================================================

export interface SimulationRun {
  id: string;
  tenantId: string;
  scenarioId: string;
  worldModelId: string;
  status: SimulationStatus;
  currentTick: number;
  currentVirtualTimeMs: number;
  comparativeResult?: {
    riskScoreDelta: number;
    criticalViolations: string[];
    summary: string;
    recommendation: 'PROCEED' | 'REVISE' | 'ABORT';
  };
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface SimulationScenario {
  id: string;
  tenantId: string;
  worldModelId: string;
  name: string;
  description?: string;
  actions: Array<{
    id: string;
    targetEntityId: string;
    actionType: string;
    parameters: Record<string, unknown>;
    scheduledVirtualTimeMs: number;
  }>;
  durationVirtualMs: number;
  tickIntervalMs: number;
  createdAt: string;
}

// ============================================================
// Workforce
// ============================================================

export interface WorkforceNode {
  agentId: string;
  parentAgentId?: string;
  teamId?: string;
  missionId: string;
  taskId?: string;
  runId?: string;
  status: 'ACTIVE' | 'TERMINATED' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// World Model
// ============================================================

export interface WorldEntity {
  id: string;
  tenantId: string;
  worldModelId: string;
  type: string;
  name: string;
  description?: string;
  properties: Record<string, unknown>;
  state: Record<string, unknown>;
  version: number;
}

export interface WorldRelationship {
  id: string;
  tenantId: string;
  worldModelId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  weight: number;
}

// ============================================================
// Policy
// ============================================================

export interface SynapsePolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  scope: string;
  rules: Array<{
    id: string;
    name: string;
    target: string;
    decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
    riskLevel: RiskLevel;
  }>;
  defaultDecision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Verification
// ============================================================

export interface VerificationRun {
  id: string;
  tenantId: string;
  planId: string;
  taskId?: string;
  overallVerdict: VerificationVerdict;
  assertionResults: Array<{
    assertionId: string;
    assertionName: string;
    type: string;
    verdict: VerificationVerdict;
    actualValue?: unknown;
    errorMessage?: string;
    executionTimeMs: number;
  }>;
  summary?: string;
  startedAt: string;
  completedAt?: string;
}

// ============================================================
// System
// ============================================================

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'error' | string;
  services: Record<string, boolean>;
  version: string;
  database?: { ok: boolean };
  engine?: { status: string; runtimeAddress?: string };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  tenantName?: string;
}

// ============================================================
// Realtime Events
// ============================================================

export interface SynapseRealtimeEvent {
  eventId: string;
  eventType: string;
  timestamp: number;
  isoTimestamp?: string;
  tenantId?: string;
  sessionId?: string;
  taskId?: string;
  agentId?: string;
  missionId?: string;
  payload: Record<string, unknown>;
  source?: string;
  sequence?: number;
}

// ============================================================
// API Error
// ============================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
