/**
 * @file EventStreamImporter.ts
 * @description Ingests real-time message streams, webhooks, and pub/sub batches with deduplication, ordering, and buffer flushing.
 */

import { WorldEvent, type EventEnvelope } from '../model/Event.js';
import type { PropertyValue } from '../model/State.js';

export interface StreamConsumerConfig {
  readonly streamId: string;
  readonly bufferSize?: number;
  readonly flushIntervalMs?: number;
  readonly deduplicateBy?: 'id' | 'payloadHash';
  readonly maxDeduplicationCacheSize?: number;
}

export type EventHandler = (events: readonly WorldEvent[]) => Promise<void> | void;

export class EventStreamImporter {
  private readonly _config: Required<StreamConsumerConfig>;
  private readonly _buffer: WorldEvent[] = [];
  private readonly _seenIds = new Set<string>();
  private readonly _handlers: EventHandler[] = [];
  private _flushTimer?: NodeJS.Timeout;
  private _isPaused = false;
  private _totalIngested = 0;
  private _totalDroppedDuplicates = 0;

  constructor(config: StreamConsumerConfig) {
    this._config = {
      streamId: config.streamId,
      bufferSize: config.bufferSize ?? 100,
      flushIntervalMs: config.flushIntervalMs ?? 1000,
      deduplicateBy: config.deduplicateBy ?? 'id',
      maxDeduplicationCacheSize: config.maxDeduplicationCacheSize ?? 10000,
    };

    this.startPeriodicFlush();
  }

  public onBatch(handler: EventHandler): this {
    this._handlers.push(handler);
    return this;
  }

  public pushRawEnvelope(envelope: EventEnvelope): boolean {
    if (this._isPaused) {
      return false; // Backpressure drop or pause indicator
    }

    const dedupKey = this._config.deduplicateBy === 'id' ? envelope.id : this.hashPayload(envelope.payload);

    if (this._seenIds.has(dedupKey)) {
      this._totalDroppedDuplicates++;
      return false;
    }

    this._seenIds.add(dedupKey);
    if (this._seenIds.size > this._config.maxDeduplicationCacheSize) {
      // Clear half old keys
      const it = this._seenIds.values();
      for (let i = 0; i < Math.floor(this._config.maxDeduplicationCacheSize / 2); i++) {
        this._seenIds.delete(it.next().value!);
      }
    }

    const event = WorldEvent.fromEnvelope(envelope);
    this._buffer.push(event);
    this._totalIngested++;

    if (this._buffer.length >= this._config.bufferSize) {
      void this.flush();
    }

    return true;
  }

  public pushBatch(envelopes: readonly EventEnvelope[]): number {
    let accepted = 0;
    for (const env of envelopes) {
      if (this.pushRawEnvelope(env)) {
        accepted++;
      }
    }
    return accepted;
  }

  public async flush(): Promise<void> {
    if (this._buffer.length === 0) return;

    const batch = this._buffer.splice(0, this._buffer.length);
    for (const handler of this._handlers) {
      try {
        await handler(batch);
      } catch (err) {
        console.error(`Error in event stream handler for stream ${this._config.streamId}:`, err);
      }
    }
  }

  public pause(): void {
    this._isPaused = true;
  }

  public resume(): void {
    this._isPaused = false;
  }

  public getStats(): {
    streamId: string;
    bufferLength: number;
    totalIngested: number;
    totalDuplicatesDropped: number;
    isPaused: boolean;
  } {
    return {
      streamId: this._config.streamId,
      bufferLength: this._buffer.length,
      totalIngested: this._totalIngested,
      totalDuplicatesDropped: this._totalDroppedDuplicates,
      isPaused: this._isPaused,
    };
  }

  public destroy(): void {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    void this.flush();
  }

  private startPeriodicFlush(): void {
    this._flushTimer = setInterval(() => {
      if (this._buffer.length > 0) {
        void this.flush();
      }
    }, this._config.flushIntervalMs);
  }

  private hashPayload(payload: Record<string, PropertyValue>): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `h_${Math.abs(hash).toString(16)}`;
  }
}
