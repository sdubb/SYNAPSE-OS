// Synapse OS - Trust, Governance, World Studio, Automation & System Types

export type VerificationVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'SKIPPED' | 'REVIEW';

export type AssertionCategory = 
  | 'TEST_SUITE'
  | 'FILE_PRESENCE'
  | 'GIT_DIFF'
  | 'API_PROBE'
  | 'SAST_SCAN'
  | 'POLICY_RULE';

export interface AssertionDetail {
  id: string;
  name: string;
  category: AssertionCategory;
  type: string;
  target: string;
  verdict: VerificationVerdict;
  expectedValue?: string | number | boolean | Record<string, unknown>;
  actualValue?: string | number | boolean | Record<string, unknown>;
  executionTimeMs: number;
  stdout?: string;
  stderr?: string;
  critical: boolean;
  errorMessage?: string;
  evidenceSha256?: string;
}

export interface MerkleEvidenceBlock {
  index: number;
  timestamp: string;
  evidenceId: string;
  evidenceType: string;
  evidenceLabel: string;
  evidenceSha256: string;
  previousBlockHash: string;
  blockHash: string;
  verified: boolean;
  rawPayloadPreview?: string;
}

export interface MerkleEvidenceChain {
  runId: string;
  rootHash: string;
  algorithm: 'SHA-256';
  blocksCount: number;
  sealedAt: string;
  isTamperProof: boolean;
  blocks: MerkleEvidenceBlock[];
}

export interface GroundTruthComparison {
  objective: string;
  agentClaim: string;
  agentClaimTimestamp: string;
  groundTruthVerdict: VerificationVerdict;
  confidenceScore: number;
  differentialSummary: string;
  mismatchesCount: number;
  assertionsPassed: number;
  totalAssertions: number;
}

export interface VerifiedTaskItem {
  id: string;
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  workspaceName: string;
  verdict: VerificationVerdict;
  assertionsSummary: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  durationMs: number;
  verifiedAt: string;
  evidenceRootHash: string;
}

export interface VerificationMetricsSummary {
  completed: number;
  passed: number;
  failed: number;
  inReview: number;
  passRatePercentage: number;
  avgVerificationTimeMs: number;
}

// Governance & Security Types
export type ApprovalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PolicyDecision = 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';

export interface ApprovalRequestItem {
  id: string;
  tenantId: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  taskId?: string;
  taskName?: string;
  workspaceId?: string;
  workspaceName?: string;
  toolName: string;
  toolParameters: Record<string, unknown>;
  sanitizedArguments: Record<string, unknown>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  blastRadius: {
    affectedEntities: string[];
    riskScore: number;
    scope: 'RESOURCE' | 'DATABASE' | 'INFRASTRUCTURE' | 'GLOBAL';
    estimatedDowntimeRisk: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'timed_out' | 'auto_approved' | 'cancelled';
  requiresTwoPersonApproval: boolean;
  firstApprover?: {
    userId: string;
    userName: string;
    approvedAt: string;
  };
  timeoutSeconds: number;
  expiresAt: string;
  createdAt: string;
}

export interface PolicyRuleCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'MATCHES_REGEX' | 'IN' | 'NOT_IN';
  value: string;
}

export interface PolicyDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  subject: string;
  environment: 'production' | 'staging' | 'development' | '*';
  operation: string;
  target: string;
  decision: PolicyDecision;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  conditions: PolicyRuleCondition[];
  rawYaml?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
  userId?: string;
  userName?: string;
  taskId?: string;
  runId?: string;
  action: string;
  resource: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision?: string;
  details: Record<string, unknown>;
  tamperProofHash: string;
  previousHash: string;
}

export type SIEMExportFormat = 'CEF' | 'Syslog' | 'JSONL';

// World Studio & Digital Twins
export type WorldEntityType = 
  | 'SERVICE'
  | 'DATABASE'
  | 'QUEUE'
  | 'API_ENDPOINT'
  | 'INFRASTRUCTURE_RESOURCE'
  | 'CODE_MODULE'
  | 'DATA_MODEL'
  | 'EXTERNAL_SYSTEM';

export type WorldRelationshipType =
  | 'DEPENDS_ON'
  | 'CALLS'
  | 'READS_FROM'
  | 'WRITES_TO'
  | 'DEPLOYS_TO'
  | 'AUTHENTICATES_WITH'
  | 'MONITORS';

export interface WorldEntityNode {
  id: string;
  name: string;
  type: WorldEntityType;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'SIMULATED_FAIL';
  properties: Record<string, unknown>;
  metrics: {
    latencyMs: number;
    errorRate: number;
    throughputRps: number;
  };
  x: number;
  y: number;
}

export interface WorldRelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: WorldRelationshipType;
  weight: number;
  latencyMs?: number;
  status: 'ACTIVE' | 'DEGRADED' | 'BROKEN';
}

export interface WorldSnapshot {
  id: string;
  timestamp: string;
  label: string;
  entities: WorldEntityNode[];
  edges: WorldRelationshipEdge[];
  checksumSha256: string;
}

export interface SimulationFaultInjection {
  targetEntityId: string;
  targetEntityName: string;
  faultType: 'OFFLINE' | 'HIGH_LATENCY' | 'DATA_CORRUPTION' | 'RATE_LIMIT_EXHAUSTION';
  durationMinutes: number;
  customParameters?: Record<string, unknown>;
}

export interface MonteCarloSweepConfig {
  iterations: number;
  concurrencyLevel: number;
  failureRateVariations: number[];
  trafficSpikeMultipliers: number[];
}

export interface SimulationImpactAnalysis {
  scenarioId: string;
  scenarioName: string;
  status: 'COMPLETED' | 'RUNNING' | 'DRAFT' | 'FAILED';
  expectedFailedPaymentsPercent: number;
  ordersAffected: number;
  estimatedRevenueImpactUsd: number;
  downstreamServicesAffectedCount: number;
  affectedServiceNames: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: 'PROCEED' | 'REVISE' | 'ABORT';
  summary: string;
  monteCarloConfidence: number;
}

// Automation & Workflows
export type WorkflowTriggerType = 'SCHEDULE_CRON' | 'WEBHOOK' | 'EVENT' | 'MANUAL';

export interface AutomationWorkflowStep {
  id: string;
  name: string;
  type: 'TRIGGER' | 'AGENT_ACTION' | 'VERIFICATION_CHECK' | 'POLICY_GATE' | 'NOTIFICATION';
  config: Record<string, unknown>;
  status?: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerType: WorkflowTriggerType;
  cronExpression?: string;
  webhookUrl?: string;
  steps: AutomationWorkflowStep[];
  lastRunAt?: string;
  lastRunStatus?: 'SUCCESS' | 'FAILURE' | 'RUNNING';
  totalRuns: number;
}

// Capabilities & Workspaces
export interface ConnectedCapability {
  id: string;
  name: string;
  category: 'TOOL' | 'MCP_SERVER' | 'MESSAGING_CONNECTOR' | 'CLOUD_PROVIDER';
  status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED';
  version: string;
  healthLatencyMs: number;
  lastHeartbeat: string;
  permissions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  toolsCount: number;
  configuration: Record<string, any>;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  environment: 'production' | 'staging' | 'development' | 'research';
  sandboxPath: string;
  gitWorktree: {
    repositoryUrl: string;
    branch: string;
    worktreePath: string;
    cleanStatus: boolean;
  };
  isolationLevel: 'CONTAINER' | 'PROCESS_SANDBOX' | 'VIRTUAL_ENV';
  activeAgentsCount: number;
  policiesAttachedCount: number;
  lastActive: string;
}

// System Configuration
export interface LLMModelInfo {
  id: string;
  provider: 'Anthropic' | 'OpenAI' | 'Google' | 'DeepSeek' | 'Ollama' | 'custom';
  name: string;
  contextWindow: number;
  inputPricingPer1M: number;
  outputPricingPer1M: number;
  rateLimitRpm: number;
  rateLimitTpm: number;
  availability: 'AVAILABLE' | 'DEGRADED' | 'RATE_LIMITED';
  enabled: boolean;
}

export interface ProviderCredential {
  id: string;
  provider: string;
  displayName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'MISSING_KEY';
  maskedApiKey: string;
  apiKey?: string;
  lastValidatedAt: string;
  endpointUrl?: string;
}

export interface TenantOrgSettings {
  id: string;
  name: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  primaryContactEmail: string;
  mfaEnforced: boolean;
  ssoEnabled: boolean;
  sessionTimeoutMinutes: number;
  allowedIpRanges: string[];
  monthlyTokenBudgetUsd: number;
  currentSpendUsd: number;
}

export interface UserRoleItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'SECURITY_OFFICER' | 'VIEWER';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  lastLoginAt: string;
}
