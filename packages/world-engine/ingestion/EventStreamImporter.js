/**
 * @file EventStreamImporter.ts
 * @description Ingests real-time message streams, webhooks, and pub/sub batches with deduplication, ordering, and buffer flushing.
 */
import { WorldEvent } from '../model/Event.js';
export class EventStreamImporter {
    _config;
    _buffer = [];
    _seenIds = new Set();
    _handlers = [];
    _flushTimer;
    _isPaused = false;
    _totalIngested = 0;
    _totalDroppedDuplicates = 0;
    constructor(config) {
        this._config = {
            streamId: config.streamId,
            bufferSize: config.bufferSize ?? 100,
            flushIntervalMs: config.flushIntervalMs ?? 1000,
            deduplicateBy: config.deduplicateBy ?? 'id',
            maxDeduplicationCacheSize: config.maxDeduplicationCacheSize ?? 10000,
        };
        this.startPeriodicFlush();
    }
    onBatch(handler) {
        this._handlers.push(handler);
        return this;
    }
    pushRawEnvelope(envelope) {
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
                this._seenIds.delete(it.next().value);
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
    pushBatch(envelopes) {
        let accepted = 0;
        for (const env of envelopes) {
            if (this.pushRawEnvelope(env)) {
                accepted++;
            }
        }
        return accepted;
    }
    async flush() {
        if (this._buffer.length === 0)
            return;
        const batch = this._buffer.splice(0, this._buffer.length);
        for (const handler of this._handlers) {
            try {
                await handler(batch);
            }
            catch (err) {
                console.error(`Error in event stream handler for stream ${this._config.streamId}:`, err);
            }
        }
    }
    pause() {
        this._isPaused = true;
    }
    resume() {
        this._isPaused = false;
    }
    getStats() {
        return {
            streamId: this._config.streamId,
            bufferLength: this._buffer.length,
            totalIngested: this._totalIngested,
            totalDuplicatesDropped: this._totalDroppedDuplicates,
            isPaused: this._isPaused,
        };
    }
    destroy() {
        if (this._flushTimer) {
            clearInterval(this._flushTimer);
        }
        void this.flush();
    }
    startPeriodicFlush() {
        this._flushTimer = setInterval(() => {
            if (this._buffer.length > 0) {
                void this.flush();
            }
        }, this._config.flushIntervalMs);
    }
    hashPayload(payload) {
        const str = JSON.stringify(payload);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return `h_${Math.abs(hash).toString(16)}`;
    }
}
//# sourceMappingURL=EventStreamImporter.js.map