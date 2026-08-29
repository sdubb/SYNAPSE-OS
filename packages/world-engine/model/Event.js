/**
 * @file Event.ts
 * @description Discrete world event representing observations, environmental triggers, actions, and telemetry.
 */
export class WorldEvent {
    id;
    type;
    source;
    timestamp;
    tenantId;
    entityId;
    correlationId;
    causationId;
    payload;
    metadata;
    constructor(envelope) {
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
    getPayload(key, defaultValue) {
        const value = this.payload[key];
        return value !== undefined ? value : defaultValue;
    }
    toEnvelope() {
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
    toJSON() {
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
    static fromEnvelope(envelope) {
        return new WorldEvent(envelope);
    }
}
//# sourceMappingURL=Event.js.map