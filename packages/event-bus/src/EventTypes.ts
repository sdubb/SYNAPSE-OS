export type EventCategory =
  | 'agent'
  | 'session'
  | 'task'
  | 'run'
  | 'attempt'
  | 'tool'
  | 'policy'
  | 'governance'
  | 'verification'
  | 'evidence'
  | 'team'
  | 'workspace'
  | 'world'
  | 'simulation'
  | 'audit'
  | 'telemetry'
  | 'system'
  | 'connector'
  | 'schedule';

export interface SynapseEventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  tenantId: string;
  missionId?: string;
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  workspaceId?: string;
  runtimeId?: string;
  userId?: string;
  timestamp: number;
  isoTimestamp: string;
  sequence: number;
  source: string;
  payload: T;
  traceId: string;
  parentEventId?: string;
  correlationId?: string;
}

export interface PublishEventInput<T = Record<string, unknown>> {
  eventType: string;
  tenantId: string;
  missionId?: string;
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  workspaceId?: string;
  runtimeId?: string;
  userId?: string;
  source?: string;
  payload: T;
  traceId?: string;
  parentEventId?: string;
  correlationId?: string;
}

export type EventHandler<T = Record<string, unknown>> = (
  event: SynapseEventEnvelope<T>
) => Promise<void> | void;

export interface SubscriptionFilter {
  tenantId?: string;
  missionId?: string;
  agentId?: string;
  taskId?: string;
  runId?: string;
  sessionId?: string;
  source?: string;
  traceId?: string;
}

export interface SubscriptionOptions {
  filter?: SubscriptionFilter;
  deadLetterHandler?: (event: SynapseEventEnvelope, error: Error) => Promise<void> | void;
}
