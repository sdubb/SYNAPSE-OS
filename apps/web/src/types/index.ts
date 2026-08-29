/**
 * Synapse OS Frontend Type Definitions
 * Adheres strictly to @synapse/contracts specification
 */

export type RunStatus =
  | 'initializing'
  | 'active'
  | 'running'
  | 'paused'
  | 'awaiting_input'
  | 'awaiting_approval'
  | 'verifying'
  | 'completed'
  | 'aborted'
  | 'failed'
  | 'timed_out'
  | 'cancelled';

export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'planned'
  | 'authorized'
  | 'queued'
  | 'running'
  | 'waiting'
  | 'verifying'
  | 'review'
  | 'completed'
  | 'failed'
  | 'recovery'
  | 'retry'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timed_out' | 'auto_approved' | 'cancelled';

export type AgentHealthStatus = 'healthy' | 'degraded' | 'idle' | 'busy' | 'error';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
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

export interface RunItem {
  id: string;
  title: string;
  missionId?: string;
  missionTitle?: string;
  taskId?: string;
  taskTitle?: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  agentAvatar?: string;
  clineSessionId: string;
  workspaceId: string;
  workspaceName?: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  tokenUsage: TokenUsage;
  runtimeMetadata: RuntimeMetadata;
  activeStep?: string;
  checkpoints: string[];
  lastCheckpointId?: string;
  tags: string[];
}

export interface TimelineEvent {
  id: string;
  runId: string;
  timestamp: string;
  type:
    | 'lifecycle'
    | 'plan'
    | 'activity'
    | 'tool'
    | 'question'
    | 'approval'
    | 'verification'
    | 'file'
    | 'test'
    | 'error';
  title: string;
  description: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'running';
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  id: string;
  runId: string;
  role: 'user' | 'agent' | 'system' | 'tool';
  timestamp: string;
  content: string;
  summary?: string;
  reason?: string;
  actions?: Array<{ name: string; status: 'pending' | 'in_progress' | 'completed' | 'failed' }>;
  evidence?: {
    filesRead?: string[];
    filesModified?: string[];
    commands?: string[];
    testsPassed?: number;
    testsTotal?: number;
    notes?: string;
  };
  questions?: Array<{
    id: string;
    question: string;
    options?: string[];
    answer?: string;
  }>;
  proposedChanges?: Array<{
    file: string;
    summary: string;
    additions: number;
    deletions: number;
  }>;
  approvalRequest?: {
    requestId: string;
    toolName: string;
    parameters: Record<string, unknown>;
    riskLevel: RiskLevel;
    reason?: string;
    status: ApprovalStatus;
  };
  toolCall?: {
    toolName: string;
    parameters: Record<string, unknown>;
    result?: unknown;
    status: 'running' | 'success' | 'failed';
  };
}

export interface ToolExecution {
  id: string;
  runId: string;
  callId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: 'success' | 'failed' | 'running' | 'blocked';
  riskLevel: RiskLevel;
  durationMs: number;
  timestamp: string;
  error?: string;
  approvedBy?: string;
}

export interface FileRecord {
  id: string;
  runId: string;
  path: string;
  action: 'read' | 'created' | 'modified' | 'deleted';
  sizeBytes: number;
  linesAdded?: number;
  linesRemoved?: number;
  timestamp: string;
  contentPreview?: string;
}

export interface CodeDiff {
  id: string;
  file: string;
  language: string;
  oldContent: string;
  newContent: string;
  additions: number;
  deletions: number;
  astModifications?: Array<{
    type: string;
    name: string;
    description: string;
  }>;
}

export interface ApprovalItem {
  id: string;
  runId: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  taskId?: string;
  taskTitle?: string;
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
  decidedBy?: string;
  decisionReason?: string;
}

export interface ModelUsageBreakdown {
  modelId: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  cacheTokens: number;
  totalTokens: number;
  costUsd: number;
  callsCount: number;
}

export interface RunUsageReport {
  runId: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCostUsd: number;
  models: ModelUsageBreakdown[];
  estimatedSavingsUsd: number;
  tokenVelocityPerMinute: number;
}

export interface VerificationAssertion {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  details: string;
  groundTruth: string;
  agentClaim: string;
  evidenceRef?: string;
}

export interface VerificationRun {
  id: string;
  runId: string;
  taskId?: string;
  verdict: 'PASS' | 'FAIL' | 'REVIEW';
  score: number; // 0 to 100
  passedAssertions: number;
  totalAssertions: number;
  assertions: VerificationAssertion[];
  testsSummary: {
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
  };
  policyViolations: number;
  agentClaim: string;
  groundTruthVerdict: string;
  completedAt: string;
}

export interface AuditRecord {
  id: string;
  runId: string;
  sequenceNumber: number;
  timestamp: string;
  hash: string;
  previousHash: string;
  signature: string;
  actorId: string;
  actorType: 'user' | 'agent' | 'system' | 'coordinator';
  action: string;
  targetResource: string;
  riskLevel: RiskLevel;
  verified: boolean;
  metadata: Record<string, unknown>;
}

export interface ToolCapability {
  name: string;
  description?: string;
  enabled: boolean;
  autoApprove: boolean;
  riskLevel: RiskLevel;
  provider?: string;
  requiredSecrets?: string[];
}

export interface AgentCapabilities {
  tools: ToolCapability[];
  mcpServers: string[];
  connectors: string[];
  customCapabilities: string[];
  filesystem: {
    read: boolean;
    write: boolean;
    restrictedPaths: string[];
    allowedPaths: string[];
  };
  network: {
    allowedHosts: string[];
    deniedHosts: string[];
    allowHttp: boolean;
    allowMcp: boolean;
  };
  terminal: {
    allowedCommands: string[];
    deniedCommands: string[];
    requireSudo: boolean;
    maxExecutionTimeMs: number;
  };
  subagents: {
    canSpawn: boolean;
    maxDepth: number;
    maxChildren: number;
  };
}

export interface AgentPolicyRule {
  id: string;
  name: string;
  condition: string;
  action: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  riskLevel: RiskLevel;
  enabled: boolean;
}

export interface AgentModelConfig {
  provider: string;
  modelId: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
}

export interface AgentItem {
  id: string;
  tenantId?: string;
  identity: {
    name: string;
    description: string;
    role: string;
    tags: string[];
    avatarUrl?: string;
  };
  instructions: {
    systemPrompt: string;
    objectives: string[];
    behavioralRules: string[];
    customInstructions?: string;
  };
  capabilities: AgentCapabilities;
  model: AgentModelConfig;
  fallbackModels: AgentModelConfig[];
  workspace: {
    repositories: string[];
    directories: string[];
    environment: Record<string, string>;
  };
  permissions: {
    files: string[];
    shell: string[];
    network: string[];
    credentials: string[];
    productionAccess: boolean;
  };
  verification: {
    strategies: string[];
    approvalRequirements: string[];
    minConfidence: number;
  };
  resourceLimits: {
    maxTokens?: number;
    maxRuntimeSeconds: number;
    maxCostUsd?: number;
    maxConcurrency: number;
  };
  policies: AgentPolicyRule[];
  healthStatus: AgentHealthStatus;
  assignedTasksCount: number;
  pastRunsCount: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  taskId: string;
  type: 'blocks' | 'requires_success' | 'parallel_with' | 'after';
}

export interface TaskExecutionHistoryItem {
  runId: string;
  runNumber: number;
  startedAt: string;
  endedAt?: string;
  status: RunStatus;
  agentName: string;
  durationSeconds: number;
  costUsd: number;
  resultSummary?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  objective: string;
  instructions: string;
  workspaceId: string;
  workspaceName?: string;
  missionId?: string;
  missionTitle?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentRole?: string;
  teamId?: string;
  teamName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progressPercent: number;
  deadline?: string;
  scheduledAt?: string;
  dependencies: TaskDependency[];
  successCriteria: string[];
  expectedOutputs: string[];
  tags: string[];
  currentRunId?: string;
  retryCount: number;
  maxRetries: number;
  executionHistory: TaskExecutionHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  agentId: string;
  agentName: string;
  agentRole: string;
  isCoordinator: boolean;
  status: AgentHealthStatus;
  currentTaskId?: string;
  currentTaskTitle?: string;
  activeRunId?: string;
  tokensUsed: number;
  costUsd: number;
}

export interface TeamItem {
  id: string;
  name: string;
  mission: string;
  description?: string;
  mode: 'explicit' | 'autonomous';
  coordinatorAgentId: string;
  coordinatorAgentName?: string;
  members: TeamMember[];
  maxTeammates: number;
  requireApprovalForTeammates: boolean;
  budgetUsd?: number;
  maxRuntimeSeconds?: number;
  status: 'active' | 'idle' | 'paused' | 'completed';
  activeTasksCount: number;
  completedTasksCount: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopologyNode {
  id: string;
  type: 'mission' | 'coordinator' | 'subagent' | 'task';
  label: string;
  subtitle?: string;
  status: string;
  health?: AgentHealthStatus;
  tokensUsed?: number;
  costUsd?: number;
  activeRunId?: string;
  agentId?: string;
  taskId?: string;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status?: 'active' | 'idle' | 'completed' | 'blocked';
}

export interface TeamTopologyData {
  teamId: string;
  mission: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export * from './trust-governance.js';
export type {
  RunSession,
  PlanStep,
  StepState,
  TechnicalDetails,
  MessageAction,
  QuestionOption,
  ClarificationQuestion,
  ToolApproval,
  VerificationEvidence,
  WorkspaceFile,
  DiffLine,
  DiffFile,
  TestResultItem,
  InfrastructureNode,
  ActiveMetrics,
  ActiveWorkItem,
  AttentionItem,
  RecentWorkItem,
} from './run.js';

export type SynapseTask = TaskItem;
export type AgentDefinition = AgentItem;
export type SynapseTeam = TeamItem;
export type ToolApprovalRequest = ApprovalItem;
export type SynapsePolicy = Record<string, unknown>;
export type VerificationResult = VerificationRun;
export type WorldEntity = Record<string, unknown>;
export type WorkspaceDefinition = Record<string, unknown>;
export type CapabilityDefinition = Record<string, unknown>;


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
  tenantId?: string;
  tenantName?: string;
  avatarUrl?: string;
}


export interface SynapseRealtimeEvent {
  eventId: string;
  eventType: string;
  timestamp: number;
  tenantId?: string;
  sessionId?: string;
  taskId?: string;
  payload: Record<string, unknown>;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'error';
  services: Record<string, boolean>;
  version: string;
}

export type SynapseSession = RunItem;
export type SessionStatus = RunStatus;
export type PolicyRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'low' | 'medium' | 'high' | 'critical';

