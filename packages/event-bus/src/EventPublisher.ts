import { randomUUID } from 'node:crypto';
import { SynapseEventEnvelope, PublishEventInput } from './EventTypes.js';

export interface EventPublisherAdapter {
  publishEnvelope(event: SynapseEventEnvelope): Promise<void>;
  getNextSequence(tenantId: string): Promise<number>;
}

export class EventPublisher {
  private readonly adapter: EventPublisherAdapter;
  private readonly defaultSource: string;

  constructor(adapter: EventPublisherAdapter, defaultSource = 'control.plane') {
    this.adapter = adapter;
    this.defaultSource = defaultSource;
  }

  /**
   * Builds and publishes a strongly-typed SynapseEventEnvelope.
   */
  public async publish<T = Record<string, unknown>>(
    input: PublishEventInput<T>
  ): Promise<SynapseEventEnvelope<T>> {
    if (!input.tenantId || input.tenantId.trim() === '') {
      throw new Error('Tenant ID is required for all published events.');
    }
    if (!input.eventType || input.eventType.trim() === '') {
      throw new Error('Event type is required for all published events.');
    }

    const now = new Date();
    const sequence = await this.adapter.getNextSequence(input.tenantId);

    const envelope: SynapseEventEnvelope<T> = {
      eventId: randomUUID(),
      eventType: input.eventType,
      tenantId: input.tenantId,
      agentId: input.agentId,
      sessionId: input.sessionId,
      taskId: input.taskId,
      workspaceId: input.workspaceId,
      runtimeId: input.runtimeId,
      timestamp: now.getTime(),
      isoTimestamp: now.toISOString(),
      sequence,
      source: input.source ?? this.defaultSource,
      payload: input.payload,
      traceId: input.traceId ?? randomUUID(),
      parentEventId: input.parentEventId,
      correlationId: input.correlationId,
    };

    await this.adapter.publishEnvelope(envelope as SynapseEventEnvelope<Record<string, unknown>>);
    return envelope;
  }

  /**
   * Batch publish multiple events atomically or sequentially.
   */
  public async publishBatch<T = Record<string, unknown>>(
    inputs: Array<PublishEventInput<T>>
  ): Promise<Array<SynapseEventEnvelope<T>>> {
    const published: Array<SynapseEventEnvelope<T>> = [];
    for (const input of inputs) {
      const env = await this.publish(input);
      published.push(env);
    }
    return published;
  }
}
