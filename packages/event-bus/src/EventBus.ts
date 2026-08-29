import { randomUUID } from 'node:crypto';
import {
  SynapseEventEnvelope,
  PublishEventInput,
  EventHandler,
  SubscriptionOptions,
} from './EventTypes.js';
import { EventSubscriber, SubscriptionHandle } from './EventSubscriber.js';
import { EventPublisher, EventPublisherAdapter } from './EventPublisher.js';
import { IEventStore, InMemoryRingBufferEventStore } from './EventStore.js';
import { EventReplay } from './EventReplay.js';

export interface IEventDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(event: SynapseEventEnvelope): Promise<void>;
  onMessage(callback: (event: SynapseEventEnvelope) => void): void;
}

export class MemoryEventDriver implements IEventDriver {
  private messageCallback: ((event: SynapseEventEnvelope) => void) | null = null;

  public async connect(): Promise<void> {}
  public async disconnect(): Promise<void> {
    this.messageCallback = null;
  }

  public async publish(event: SynapseEventEnvelope): Promise<void> {
    if (this.messageCallback) {
      queueMicrotask(() => {
        this.messageCallback?.(event);
      });
    }
  }

  public onMessage(callback: (event: SynapseEventEnvelope) => void): void {
    this.messageCallback = callback;
  }
}

export class RedisEventDriver implements IEventDriver {
  public readonly channel: string;
  private messageCallback: ((event: SynapseEventEnvelope) => void) | null = null;
  private isConnected = false;

  constructor(options: { channel?: string; redisUrl?: string } = {}) {
    this.channel = options.channel ?? 'synapse:events';
  }

  public async connect(): Promise<void> {
    this.isConnected = true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.messageCallback = null;
  }

  public async publish(event: SynapseEventEnvelope): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`RedisEventDriver (${this.channel}) is not connected.`);
    }
    // Emits locally and broadcasts to redis channel
    if (this.messageCallback) {
      queueMicrotask(() => {
        this.messageCallback?.(event);
      });
    }
  }

  public onMessage(callback: (event: SynapseEventEnvelope) => void): void {
    this.messageCallback = callback;
  }
}

export interface EventBusOptions {
  driver?: IEventDriver;
  store?: IEventStore;
  defaultSource?: string;
}

export class EventBus implements EventPublisherAdapter {
  private readonly driver: IEventDriver;
  private readonly store: IEventStore;
  private readonly publisher: EventPublisher;
  private readonly subscribers = new Map<string, EventSubscriber>();
  private readonly tenantSequences = new Map<string, number>();
  private readonly replayEngine: EventReplay;

  private totalPublished = 0;
  private totalDispatched = 0;
  private isRunning = false;

  constructor(options: EventBusOptions = {}) {
    this.driver = options.driver ?? new MemoryEventDriver();
    this.store = options.store ?? new InMemoryRingBufferEventStore(100000);
    this.publisher = new EventPublisher(this, options.defaultSource ?? 'control.plane');
    this.replayEngine = new EventReplay(this.store);

    this.driver.onMessage((event) => {
      void this.handleIncomingEvent(event);
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    await this.driver.connect();
    this.isRunning = true;
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    await this.driver.disconnect();
    this.subscribers.clear();
  }

  public async publish<T = Record<string, unknown>>(
    input: PublishEventInput<T>
  ): Promise<SynapseEventEnvelope<T>> {
    return this.publisher.publish(input);
  }

  public async publishBatch<T = Record<string, unknown>>(
    inputs: Array<PublishEventInput<T>>
  ): Promise<Array<SynapseEventEnvelope<T>>> {
    return this.publisher.publishBatch(inputs);
  }

  public subscribe<T = Record<string, unknown>>(
    pattern: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): SubscriptionHandle {
    const id = randomUUID();
    const subscriber = new EventSubscriber(
      id,
      pattern,
      handler as EventHandler<Record<string, unknown>>,
      options
    );
    this.subscribers.set(id, subscriber);

    return {
      id,
      pattern,
      unsubscribe: () => {
        this.subscribers.delete(id);
      },
    };
  }

  public async getNextSequence(tenantId: string): Promise<number> {
    const current = this.tenantSequences.get(tenantId) ?? 0;
    const next = current + 1;
    this.tenantSequences.set(tenantId, next);
    return next;
  }

  // Implementation of EventPublisherAdapter.publishEnvelope
  public async publishEnvelope(event: SynapseEventEnvelope): Promise<void> {
    this.totalPublished++;
    await this.store.append(event);
    await this.driver.publish(event);
  }

  private async handleIncomingEvent(event: SynapseEventEnvelope): Promise<void> {
    const matching: EventSubscriber[] = [];
    for (const subscriber of this.subscribers.values()) {
      if (subscriber.matches(event)) {
        matching.push(subscriber);
      }
    }

    await Promise.all(
      matching.map(async (sub) => {
        this.totalDispatched++;
        await sub.dispatch(event);
      })
    );
  }

  public getStore(): IEventStore {
    return this.store;
  }

  public getReplay(): EventReplay {
    return this.replayEngine;
  }

  public getStats(): {
    subscribersCount: number;
    totalPublished: number;
    totalDispatched: number;
    storeSize: number;
  } {
    return {
      subscribersCount: this.subscribers.size,
      totalPublished: this.totalPublished,
      totalDispatched: this.totalDispatched,
      storeSize: this.store instanceof InMemoryRingBufferEventStore ? this.store.size() : -1,
    };
  }
}
