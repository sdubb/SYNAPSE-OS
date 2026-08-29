/**
 * @file StateReducer.ts
 * @description Deterministic event reduction, immutable state folding, and event replay for Synapse OS entities.
 */

import { AgentStateRecord, AgentStatus, StateTransitionRecord } from './AgentState.js';
import { SessionStateRecord, SessionStatus, SessionToolInvocation } from './SessionState.js';
import { TaskStateRecord, TaskStatus, TaskAttemptRecord, TaskArtifact, TaskVerificationSummary } from './TaskState.js';

export interface SynapseEventEnvelope {
  readonly eventId: string;
  readonly eventType: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly agentId?: string;
  readonly sessionId?: string;
  readonly taskId?: string;
  readonly timestamp: Date;
  readonly payload: Record<string, unknown>;
}

export class StateReducer {
  public static reduceAgentState(
    current: AgentStateRecord,
    event: SynapseEventEnvelope
  ): AgentStateRecord {
    const timestamp = new Date(event.timestamp);

    switch (event.eventType) {
      case 'AGENT_STATUS_CHANGED': {
        const to = event.payload.newStatus as AgentStatus;
        const reason = (event.payload.reason as string) ?? 'Status updated by event';
        const triggeredBy = event.payload.triggeredBy as string | undefined;

        const newTransition: StateTransitionRecord = {
          from: current.status,
          to,
          reason,
          triggeredBy,
          timestamp,
        };

        return {
          ...current,
          status: to,
          currentSessionId: event.payload.sessionId ? (event.payload.sessionId as string) : current.currentSessionId,
          currentTaskId: event.payload.taskId ? (event.payload.taskId as string) : current.currentTaskId,
          runtimeInstanceId: event.payload.runtimeInstanceId ? (event.payload.runtimeInstanceId as string) : current.runtimeInstanceId,
          allocatedWorkspacePath: event.payload.workspacePath ? (event.payload.workspacePath as string) : current.allocatedWorkspacePath,
          transitionHistory: Object.freeze([...current.transitionHistory, newTransition]),
          updatedAt: timestamp,
          lastActiveAt: timestamp,
        };
      }

      case 'AGENT_SESSION_COMPLETED': {
        const tokens = (event.payload.tokensConsumed as number) ?? 0;
        const cost = (event.payload.costUsd as number) ?? 0;
        const tools = (event.payload.toolCalls as number) ?? 0;

        return {
          ...current,
          status: 'IDLE',
          currentSessionId: undefined,
          metrics: {
            totalSessionsRun: current.metrics.totalSessionsRun + 1,
            totalTasksCompleted: current.metrics.totalTasksCompleted + (event.payload.taskSuccess ? 1 : 0),
            totalTasksFailed: current.metrics.totalTasksFailed + (event.payload.taskSuccess ? 0 : 1),
            totalTokensConsumed: current.metrics.totalTokensConsumed + tokens,
            totalCostUsd: Number((current.metrics.totalCostUsd + cost).toFixed(4)),
            totalToolCalls: current.metrics.totalToolCalls + tools,
          },
          updatedAt: timestamp,
          lastActiveAt: timestamp,
        };
      }

      default:
        return current;
    }
  }

  public static reduceSessionState(
    current: SessionStateRecord,
    event: SynapseEventEnvelope
  ): SessionStateRecord {
    const timestamp = new Date(event.timestamp);

    switch (event.eventType) {
      case 'SESSION_STATUS_CHANGED': {
        const newStatus = event.payload.newStatus as SessionStatus;
        return {
          ...current,
          status: newStatus,
          updatedAt: timestamp,
          endedAt: ['COMPLETED', 'ABORTED', 'FAILED'].includes(newStatus) ? timestamp : current.endedAt,
        };
      }

      case 'SESSION_CLINE_CORRELATED': {
        const clineSessionId = event.payload.clineSessionId as string;
        return {
          ...current,
          clineSessionId,
          updatedAt: timestamp,
        };
      }

      case 'SESSION_TOKENS_CONSUMED': {
        const prompt = (event.payload.promptTokens as number) ?? 0;
        const completion = (event.payload.completionTokens as number) ?? 0;
        const cost = (event.payload.costUsd as number) ?? 0;
        const cacheWrite = (event.payload.cacheWriteTokens as number) ?? 0;
        const cacheRead = (event.payload.cacheReadTokens as number) ?? 0;

        return {
          ...current,
          streamCursor: current.streamCursor + 1,
          metrics: {
            promptTokens: current.metrics.promptTokens + prompt,
            completionTokens: current.metrics.completionTokens + completion,
            totalTokens: current.metrics.totalTokens + prompt + completion,
            costUsd: Number((current.metrics.costUsd + cost).toFixed(4)),
            cacheWriteTokens: current.metrics.cacheWriteTokens + cacheWrite,
            cacheReadTokens: current.metrics.cacheReadTokens + cacheRead,
          },
          updatedAt: timestamp,
        };
      }

      case 'SESSION_TOOL_INVOKED': {
        const invocation: SessionToolInvocation = {
          invocationId: event.payload.invocationId as string,
          toolName: event.payload.toolName as string,
          parameters: (event.payload.parameters as Record<string, unknown>) ?? {},
          startedAt: timestamp,
          status: 'EXECUTING',
        };

        return {
          ...current,
          streamCursor: current.streamCursor + 1,
          toolInvocations: Object.freeze([...current.toolInvocations, invocation]),
          updatedAt: timestamp,
        };
      }

      case 'SESSION_TOOL_COMPLETED': {
        const invocationId = event.payload.invocationId as string;
        const status = event.payload.status as SessionToolInvocation['status'];
        const durationMs = event.payload.durationMs as number | undefined;
        const error = event.payload.error as string | undefined;

        const updatedInvocations = current.toolInvocations.map((inv) => {
          if (inv.invocationId === invocationId) {
            return {
              ...inv,
              completedAt: timestamp,
              durationMs,
              status,
              error,
            };
          }
          return inv;
        });

        return {
          ...current,
          streamCursor: current.streamCursor + 1,
          toolInvocations: Object.freeze(updatedInvocations),
          updatedAt: timestamp,
        };
      }

      default:
        return current;
    }
  }

  public static reduceTaskState(
    current: TaskStateRecord,
    event: SynapseEventEnvelope
  ): TaskStateRecord {
    const timestamp = new Date(event.timestamp);

    switch (event.eventType) {
      case 'TASK_STATUS_CHANGED': {
        const to = event.payload.newStatus as TaskStatus;
        return {
          ...current,
          status: to,
          startedAt: to === 'RUNNING' && !current.startedAt ? timestamp : current.startedAt,
          completedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(to) ? timestamp : current.completedAt,
          updatedAt: timestamp,
        };
      }

      case 'TASK_ATTEMPT_RECORDED': {
        const attempt = event.payload.attempt as TaskAttemptRecord;
        return {
          ...current,
          attempts: Object.freeze([...current.attempts, attempt]),
          updatedAt: timestamp,
        };
      }

      case 'TASK_ARTIFACT_ATTACHED': {
        const artifact = event.payload.artifact as TaskArtifact;
        return {
          ...current,
          artifacts: Object.freeze([...current.artifacts, artifact]),
          updatedAt: timestamp,
        };
      }

      case 'TASK_VERIFICATION_RECORDED': {
        const verification = event.payload.verification as TaskVerificationSummary;
        return {
          ...current,
          verifications: Object.freeze([...current.verifications, verification]),
          updatedAt: timestamp,
        };
      }

      case 'TASK_RETRY_INCREMENTED': {
        return {
          ...current,
          status: 'RETRY',
          retryPolicy: {
            ...current.retryPolicy,
            currentRetry: current.retryPolicy.currentRetry + 1,
          },
          updatedAt: timestamp,
        };
      }

      default:
        return current;
    }
  }

  public static replayEvents<T>(
    initialState: T,
    events: readonly SynapseEventEnvelope[],
    reducer: (state: T, event: SynapseEventEnvelope) => T
  ): T {
    let state = initialState;
    for (const evt of events) {
      state = reducer(state, evt);
    }
    return state;
  }
}
