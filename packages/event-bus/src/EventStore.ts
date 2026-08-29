import { SynapseEventEnvelope } from './EventTypes.js';

export interface EventStoreQuery {
  tenantId?: string;
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  eventTypes?: string[];
  fromSequence?: number;
  toSequence?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

export interface IEventStore {
  append(event: SynapseEventEnvelope): Promise<void>;
  query(query: EventStoreQuery): Promise<SynapseEventEnvelope[]>;
  getLatestSequence(tenantId: string): Promise<number>;
  getEventsAfterSequence(
    tenantId: string,
    sequence: number,
    limit?: number
  ): Promise<SynapseEventEnvelope[]>;
}

export class InMemoryRingBufferEventStore implements IEventStore {
  private readonly capacity: number;
  private readonly buffer: (SynapseEventEnvelope | null)[];
  private head = 0;
  private count = 0;
  private sequenceCounters = new Map<string, number>();

  constructor(capacity = 50000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }

  public async append(event: SynapseEventEnvelope): Promise<void> {
    const currentSeq = this.sequenceCounters.get(event.tenantId) ?? 0;
    if (event.sequence > currentSeq) {
      this.sequenceCounters.set(event.tenantId, event.sequence);
    }

    this.buffer[this.head] = event;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  public async getLatestSequence(tenantId: string): Promise<number> {
    return this.sequenceCounters.get(tenantId) ?? 0;
  }

  public async query(query: EventStoreQuery): Promise<SynapseEventEnvelope[]> {
    const all = this.getAllBufferedEvents();

    const filtered = all.filter((evt) => {
      if (query.tenantId && evt.tenantId !== query.tenantId) return false;
      if (query.agentId && evt.agentId !== query.agentId) return false;
      if (query.taskId && evt.taskId !== query.taskId) return false;
      if (query.sessionId && evt.sessionId !== query.sessionId) return false;
      if (query.eventTypes && query.eventTypes.length > 0 && !query.eventTypes.includes(evt.eventType)) return false;
      if (query.fromSequence !== undefined && evt.sequence < query.fromSequence) return false;
      if (query.toSequence !== undefined && evt.sequence > query.toSequence) return false;
      if (query.fromTimestamp !== undefined && evt.timestamp < query.fromTimestamp) return false;
      if (query.toTimestamp !== undefined && evt.timestamp > query.toTimestamp) return false;
      return true;
    });

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return filtered.slice(offset, offset + limit);
  }

  public async getEventsAfterSequence(
    tenantId: string,
    sequence: number,
    limit = 100
  ): Promise<SynapseEventEnvelope[]> {
    const all = this.getAllBufferedEvents();
    return all
      .filter((evt) => evt.tenantId === tenantId && evt.sequence > sequence)
      .slice(0, limit);
  }

  private getAllBufferedEvents(): SynapseEventEnvelope[] {
    const result: SynapseEventEnvelope[] = [];
    if (this.count === 0) return result;

    const startIdx = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      const idx = (startIdx + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== null) {
        result.push(item);
      }
    }
    return result;
  }

  public size(): number {
    return this.count;
  }

  public clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.count = 0;
    this.sequenceCounters.clear();
  }
}
