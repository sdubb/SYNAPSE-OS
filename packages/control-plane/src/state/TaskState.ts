/**
 * @file TaskState.ts
 * @description Task DAG state models, lifecycle transitions, and execution attempt tracking for Synapse OS.
 */

export type TaskStatus =
  | 'BACKLOG'
  | 'PLANNED'
  | 'QUEUED'
  | 'RUNNING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRY'
  | 'CANCELLED';

export interface TaskAttemptRecord {
  readonly attemptNumber: number;
  readonly sessionId: string;
  readonly agentId: string;
  readonly startedAt: Date;
  readonly endedAt?: Date;
  readonly exitStatus: 'SUCCESS' | 'FAILURE' | 'ABORTED';
  readonly error?: string;
  readonly outputSummary?: string;
}

export interface TaskArtifact {
  readonly artifactId: string;
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly sha256Hash: string;
  readonly sizeBytes: number;
  readonly artifactType: 'CODE' | 'DIFF' | 'TEST_REPORT' | 'BUILD_OUTPUT' | 'DOCUMENTATION';
  readonly createdAt: Date;
}

export interface TaskVerificationSummary {
  readonly verificationId: string;
  readonly verifierType: 'FILE' | 'GIT' | 'TEST' | 'BUILD' | 'SECURITY' | 'AGENT_REVIEW';
  readonly passed: boolean;
  readonly score: number;
  readonly details: string;
  readonly checkedAt: Date;
}

export interface TaskRetryPolicy {
  readonly maxRetries: number;
  readonly currentRetry: number;
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
  readonly backoffMultiplier: number;
}

export interface TaskStateRecord {
  readonly taskId: string;
  readonly parentTaskId?: string;
  readonly tenantId: string;
  readonly title: string;
  readonly description: string;
  readonly assignedAgentId?: string;
  readonly assignedTeamId?: string;
  readonly status: TaskStatus;
  readonly dependencies: readonly string[]; // IDs of tasks that MUST complete before this starts
  readonly dependents: readonly string[];   // IDs of tasks blocked by this task
  readonly priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  readonly attempts: readonly TaskAttemptRecord[];
  readonly retryPolicy: TaskRetryPolicy;
  readonly artifacts: readonly TaskArtifact[];
  readonly verifications: readonly TaskVerificationSummary[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
}

export class TaskStateValidator {
  private static readonly VALID_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
    BACKLOG: ['PLANNED', 'CANCELLED'],
    PLANNED: ['QUEUED', 'CANCELLED', 'BACKLOG'],
    QUEUED: ['RUNNING', 'CANCELLED', 'PLANNED'],
    RUNNING: ['VERIFYING', 'FAILED', 'RETRY', 'CANCELLED', 'COMPLETED'],
    VERIFYING: ['COMPLETED', 'FAILED', 'RETRY', 'RUNNING'],
    RETRY: ['QUEUED', 'RUNNING', 'FAILED', 'CANCELLED'],
    COMPLETED: [],
    FAILED: ['RETRY', 'PLANNED'], // Allows manual or policy-based retry restart
    CANCELLED: ['PLANNED'],
  };

  public static canTransition(from: TaskStatus, to: TaskStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static validateTransition(from: TaskStatus, to: TaskStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Illegal task state machine transition from '${from}' to '${to}'`);
    }
  }

  public static createInitial(
    taskId: string,
    tenantId: string,
    title: string,
    description: string,
    dependencies: readonly string[] = [],
    parentTaskId?: string,
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL',
    maxRetries: number = 3
  ): TaskStateRecord {
    const now = new Date();
    return {
      taskId,
      parentTaskId,
      tenantId,
      title,
      description,
      status: 'BACKLOG',
      dependencies: Object.freeze([...dependencies]),
      dependents: Object.freeze([]),
      priority,
      attempts: Object.freeze([]),
      retryPolicy: Object.freeze({
        maxRetries,
        currentRetry: 0,
        initialBackoffMs: 2000,
        maxBackoffMs: 60_000,
        backoffMultiplier: 2.0,
      }),
      artifacts: Object.freeze([]),
      verifications: Object.freeze([]),
      createdAt: now,
      updatedAt: now,
    };
  }
}
