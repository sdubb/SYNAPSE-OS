/**
 * @file EventStreamImporter.ts
 * @description Ingests real-time message streams, webhooks, and pub/sub batches with deduplication, ordering, and buffer flushing.
 */
import { WorldEvent, type EventEnvelope } from '../model/Event.js';
export interface StreamConsumerConfig {
    readonly streamId: string;
    readonly bufferSize?: number;
    readonly flushIntervalMs?: number;
    readonly deduplicateBy?: 'id' | 'payloadHash';
    readonly maxDeduplicationCacheSize?: number;
}
export type EventHandler = (events: readonly WorldEvent[]) => Promise<void> | void;
export declare class EventStreamImporter {
    private readonly _config;
    private readonly _buffer;
    private readonly _seenIds;
    private readonly _handlers;
    private _flushTimer?;
    private _isPaused;
    private _totalIngested;
    private _totalDroppedDuplicates;
    constructor(config: StreamConsumerConfig);
    onBatch(handler: EventHandler): this;
    pushRawEnvelope(envelope: EventEnvelope): boolean;
    pushBatch(envelopes: readonly EventEnvelope[]): number;
    flush(): Promise<void>;
    pause(): void;
    resume(): void;
    getStats(): {
        streamId: string;
        bufferLength: number;
        totalIngested: number;
        totalDuplicatesDropped: number;
        isPaused: boolean;
    };
    destroy(): void;
    private startPeriodicFlush;
    private hashPayload;
}
//# sourceMappingURL=EventStreamImporter.d.ts.map