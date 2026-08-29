export type RunStatus =
  | 'DRAFT'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'AWAITING_CLARIFICATION'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'PAUSED'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED';

export type Environment = 'Development' | 'Staging' | 'Production';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StepState = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

export interface PlanStep {
  id: string;
  index: number;
  title: string;
  description?: string;
  status: StepState;
  phase: 'Understand' | 'Investigate' | 'Fix' | 'Test' | 'Verify' | 'Deploy';
  durationMs?: number;
  evidenceId?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  reason: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  timestamp: string;
  toolName?: string;
  filesInspected?: string[];
  filesModified?: string[];
  commandRun?: string;
  evidence?: string;
}

export interface TechnicalDetails {
  filesRead: string[];
  filesModified: string[];
  commands: string[];
  tests: {
    passed: number;
    failed: number;
    total: number;
    durationMs?: number;
  };
  clineSessionId: string;
  tools: string[];
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalCostUsd: number;
  };
}

export interface MessageAction {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  icon?: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  context?: string;
  options?: QuestionOption[];
  allowCustomInput?: boolean;
  answered?: boolean;
  answer?: string;
}

export interface ToolApproval {
  id: string;
  callId: string;
  toolName: string;
  riskLevel: RiskLevel;
  reason: string;
  parameters: Record<string, unknown>;
  affectedFiles?: string[];
  affectedResources?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  requestedAt: string;
  resolvedAt?: string;
  decidedBy?: string;
}

export interface VerificationEvidence {
  id: string;
  title: string;
  verdict: 'PASS' | 'FAIL' | 'REVIEW' | 'INCONCLUSIVE';
  claim: string;
  groundTruth: string;
  assertions: Array<{
    name: string;
    passed: boolean;
    evidence: string;
  }>;
  testedAt: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'cline' | 'system';
  timestamp: string;
  // User message fields
  content?: string;
  attachments?: Array<{ name: string; size: string; type: string }>;
  mentions?: string[];
  
  // Cline structured message fields
  title?: string;
  summary?: string;
  reason?: string;
  actions?: MessageAction[];
  activities?: ActivityItem[];
  question?: ClarificationQuestion;
  approval?: ToolApproval;
  evidence?: VerificationEvidence;
  plan?: PlanStep[];
  technicalDetails?: TechnicalDetails;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: WorkspaceFile[];
  size?: number;
  language?: string;
  status?: 'modified' | 'added' | 'deleted' | 'unmodified';
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffFile {
  id: string;
  filename: string;
  oldPath?: string;
  newPath?: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

export interface TestResultItem {
  id: string;
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  errorMessage?: string;
  assertionCount: number;
}

export interface InfrastructureNode {
  id: string;
  name: string;
  type: 'service' | 'database' | 'api' | 'queue' | 'agent' | 'external';
  status: 'healthy' | 'warning' | 'degraded' | 'offline';
  metadata: Record<string, string>;
  dependencies: string[];
}

export interface RunSession {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  taskTitle: string;
  taskObjective: string;
  environment: Environment;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  currentPhase: 'Understand' | 'Investigate' | 'Fix' | 'Test' | 'Verify';
  activeWorkspaceTab: 'preview' | 'files' | 'diff' | 'terminal' | 'tests' | 'infra';
  previewUrl?: string;
  activePlan: PlanStep[];
  messages: ConversationMessage[];
  pendingApprovals: ToolApproval[];
  technicalDetails: TechnicalDetails;
  workspaceFiles: WorkspaceFile[];
  diffFiles: DiffFile[];
  testResults: TestResultItem[];
  infrastructureNodes: InfrastructureNode[];
  terminalLogs: Array<{ id: string; timestamp: string; level: 'info' | 'warn' | 'error' | 'cmd'; text: string }>;
}

export interface ActiveMetrics {
  running: number;
  waiting: number;
  verifying: number;
  todayTotal: number;
}

export interface ActiveWorkItem {
  id: string;
  title: string;
  agentName: string;
  status: RunStatus;
  duration: string;
  currentAction: string;
}

export interface AttentionItem {
  id: string;
  runId: string;
  type: 'approval' | 'verification_failure' | 'question';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export interface RecentWorkItem {
  id: string;
  taskTitle: string;
  agentName: string;
  result: 'Verified' | 'Failed' | 'Completed' | 'Cancelled';
  resultStatus: 'success' | 'danger' | 'info' | 'warning';
  completedAt: string;
  duration: string;
}
