/**
 * @file SessionState.ts
 * @description State models, token metrics, and Cline correlation mappings for Synapse OS Sessions.
 */

export type SessionStatus =
  | 'CREATING'
  | 'ACTIVE'
  | 'STREAMING'
  | 'PAUSED'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'ABORTED'
  | 'FAILED';

export interface SessionTokenMetrics {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly costUsd: number;
  readonly cacheWriteTokens: number;
  readonly cacheReadTokens: number;
}

export interface SessionToolInvocation {
  readonly invocationId: string;
  readonly toolName: string;
  readonly parameters: Record<string, unknown>;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly durationMs?: number;
  readonly status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'ERROR' | 'REJECTED';
  readonly error?: string;
}

export interface PendingApprovalDetails {
  readonly approvalId: string;
  readonly toolName: string;
  readonly parameters: Record<string, unknown>;
  readonly requestedAt: Date;
  readonly timeoutAt: Date;
}

export interface SessionStateRecord {
  readonly sessionId: string;
  readonly clineSessionId?: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly taskId?: string;
  readonly teamId?: string;
  readonly workspacePath: string;
  readonly status: SessionStatus;
  readonly streamCursor: number;
  readonly metrics: SessionTokenMetrics;
  readonly toolInvocations: readonly SessionToolInvocation[];
  readonly pendingApproval?: PendingApprovalDetails;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly endedAt?: Date;
}

export class SessionStateValidator {
  private static readonly VALID_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
    CREATING: ['ACTIVE', 'FAILED', 'ABORTED'],
    ACTIVE: ['STREAMING', 'PAUSED', 'AWAITING_APPROVAL', 'COMPLETED', 'ABORTED', 'FAILED'],
    STREAMING: ['ACTIVE', 'PAUSED', 'AWAITING_APPROVAL', 'COMPLETED', 'ABORTED', 'FAILED'],
    PAUSED: ['ACTIVE', 'STREAMING', 'ABORTED', 'FAILED'],
    AWAITING_APPROVAL: ['ACTIVE', 'STREAMING', 'ABORTED', 'FAILED'],
    COMPLETED: [],
    ABORTED: [],
    FAILED: [],
  };

  public static canTransition(from: SessionStatus, to: SessionStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static validateTransition(from: SessionStatus, to: SessionStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Illegal session state transition from '${from}' to '${to}'`);
    }
  }

  public static createInitial(
    sessionId: string,
    tenantId: string,
    agentId: string,
    workspacePath: string,
    taskId?: string,
    teamId?: string
  ): SessionStateRecord {
    const now = new Date();
    return {
      sessionId,
      tenantId,
      agentId,
      workspacePath,
      taskId,
      teamId,
      status: 'CREATING',
      streamCursor: 0,
      metrics: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
      },
      toolInvocations: [],
      createdAt: now,
      updatedAt: now,
    };
  }
}
