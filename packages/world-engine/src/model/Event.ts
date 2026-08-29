/**
 * @file Event.ts
 * @description Discrete world event representing observations, environmental triggers, actions, and telemetry.
 */

import type { PropertyValue } from './State.js';

export type EventType =
  | 'telemetry.metric'
  | 'telemetry.log'
  | 'state.changed'
  | 'entity.created'
  | 'entity.updated'
  | 'entity.deleted'
  | 'relationship.created'
  | 'relationship.deleted'
  | 'environment.mutation'
  | 'simulation.step'
  | 'agent.action'
  | 'system.drift_detected'
  | (string & {});

export interface EventEnvelope<T = Record<string, PropertyValue>> {
  readonly id: string;
  readonly type: EventType;
  readonly source: string;
  readonly timestamp: number;
  readonly tenantId?: string;
  readonly entityId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly payload: T;
  readonly metadata?: Record<string, PropertyValue>;
}

export class WorldEvent {
  public readonly id: string;
  public readonly type: EventType;
  public readonly source: string;
  public readonly timestamp: number;
  public readonly tenantId?: string;
  public readonly entityId?: string;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly payload: Readonly<Record<string, PropertyValue>>;
  public readonly metadata: Readonly<Record<string, PropertyValue>>;

  constructor(envelope: Partial<EventEnvelope> & { type: EventType; payload: Record<string, PropertyValue> }) {
    this.id = envelope.id ?? `evt_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    this.type = envelope.type;
    this.source = envelope.source ?? 'world-engine';
    this.timestamp = envelope.timestamp ?? Date.now();
    this.tenantId = envelope.tenantId;
    this.entityId = envelope.entityId;
    this.correlationId = envelope.correlationId;
    this.causationId = envelope.causationId;
    this.payload = Object.freeze({ ...envelope.payload });
    this.metadata = Object.freeze(envelope.metadata ? { ...envelope.metadata } : {});
  }

  public getPayload<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined {
    const value = this.payload[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  public toEnvelope(): EventEnvelope {
    return {
      id: this.id,
      type: this.type,
      source: this.source,
      timestamp: this.timestamp,
      tenantId: this.tenantId,
      entityId: this.entityId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      payload: { ...this.payload },
      metadata: { ...this.metadata },
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      source: this.source,
      timestamp: this.timestamp,
      tenantId: this.tenantId,
      entityId: this.entityId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      payload: { ...this.payload },
      metadata: { ...this.metadata },
    };
  }

  public static fromEnvelope(envelope: EventEnvelope): WorldEvent {
    return new WorldEvent(envelope);
  }
}
