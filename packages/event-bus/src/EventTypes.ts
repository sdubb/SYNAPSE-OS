export type EventCategory =
  | 'agent'
  | 'session'
  | 'task'
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
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  workspaceId?: string;
  runtimeId?: string;
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
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  workspaceId?: string;
  runtimeId?: string;
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
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  source?: string;
  traceId?: string;
}

export interface SubscriptionOptions {
  filter?: SubscriptionFilter;
  deadLetterHandler?: (event: SynapseEventEnvelope, error: Error) => Promise<void> | void;
}
