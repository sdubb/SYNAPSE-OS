/**
 * @file AgentState.ts
 * @description State models, status enumerations, and transition validations for Synapse OS Agents.
 */

export type AgentStatus =
  | 'IDLE'
  | 'ASSIGNED'
  | 'INITIALIZING'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ABORTED'
  | 'KILLED'
  | 'FAILED';

export interface StateTransitionRecord {
  readonly from: AgentStatus;
  readonly to: AgentStatus;
  readonly reason: string;
  readonly triggeredBy?: string;
  readonly timestamp: Date;
}

export interface AgentExecutionMetrics {
  readonly totalSessionsRun: number;
  readonly totalTasksCompleted: number;
  readonly totalTasksFailed: number;
  readonly totalTokensConsumed: number;
  readonly totalCostUsd: number;
  readonly totalToolCalls: number;
}

export interface AgentStateRecord {
  readonly agentId: string;
  readonly tenantId: string;
  readonly status: AgentStatus;
  readonly currentSessionId?: string;
  readonly currentTaskId?: string;
  readonly runtimeInstanceId?: string;
  readonly allocatedWorkspacePath?: string;
  readonly metrics: AgentExecutionMetrics;
  readonly transitionHistory: readonly StateTransitionRecord[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActiveAt: Date;
}

export class AgentStateValidator {
  private static readonly VALID_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
    IDLE: ['ASSIGNED', 'INITIALIZING', 'RUNNING', 'STOPPED', 'KILLED'],
    ASSIGNED: ['INITIALIZING', 'RUNNING', 'IDLE', 'ABORTED', 'KILLED'],
    INITIALIZING: ['RUNNING', 'FAILED', 'ABORTED', 'KILLED'],
    RUNNING: ['PAUSED', 'STOPPED', 'ABORTED', 'KILLED', 'FAILED', 'IDLE'],
    PAUSED: ['RUNNING', 'STOPPED', 'ABORTED', 'KILLED'],
    STOPPED: ['IDLE', 'INITIALIZING', 'RUNNING', 'KILLED'],
    ABORTED: ['IDLE', 'INITIALIZING', 'KILLED'],
    KILLED: ['IDLE'], // Allowed to reset to IDLE upon explicit supervisor reset
    FAILED: ['IDLE', 'INITIALIZING', 'RUNNING', 'KILLED'],
  };

  public static canTransition(from: AgentStatus, to: AgentStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static validateTransition(from: AgentStatus, to: AgentStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Illegal agent lifecycle transition from '${from}' to '${to}'`);
    }
  }

  public static createInitial(agentId: string, tenantId: string): AgentStateRecord {
    const now = new Date();
    return {
      agentId,
      tenantId,
      status: 'IDLE',
      metrics: {
        totalSessionsRun: 0,
        totalTasksCompleted: 0,
        totalTasksFailed: 0,
        totalTokensConsumed: 0,
        totalCostUsd: 0,
        totalToolCalls: 0,
      },
      transitionHistory: [],
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };
  }
}
