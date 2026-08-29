/**
 * @file Entity.ts
 * @description Node representation in the World Engine state graph with type descriptors, property state, and lifecycle tracking.
 */
import { State } from './State.js';
export class Entity {
    id;
    type;
    name;
    status;
    _state;
    metadata;
    constructor(config) {
        if (!config.id || typeof config.id !== 'string') {
            throw new Error('Entity must have a non-empty string ID');
        }
        if (!config.type || typeof config.type !== 'string') {
            throw new Error('Entity must have a non-empty string type');
        }
        this.id = config.id;
        this.type = config.type;
        this.name = config.name ?? config.id;
        this.status = config.status ?? 'active';
        if (config.state instanceof State) {
            this._state = config.state;
        }
        else {
            this._state = new State(config.state ?? {}, {
                version: config.metadata?.version ?? 1,
                source: config.metadata?.sourceSystem ?? 'system',
            });
        }
        const now = Date.now();
        this.metadata = Object.freeze({
            tenantId: config.metadata?.tenantId,
            namespace: config.metadata?.namespace ?? 'default',
            createdAt: config.metadata?.createdAt ?? now,
            updatedAt: config.metadata?.updatedAt ?? now,
            version: config.metadata?.version ?? 1,
            confidenceScore: config.metadata?.confidenceScore ?? 1.0,
            tags: Object.freeze(config.metadata?.tags ? [...config.metadata.tags] : []),
            sourceSystem: config.metadata?.sourceSystem,
            externalId: config.metadata?.externalId,
        });
    }
    get state() {
        return this._state;
    }
    get properties() {
        return this._state.properties;
    }
    get(key, defaultValue) {
        return this._state.get(key, defaultValue);
    }
    cloneWithState(newState, metadataOverride, statusOverride) {
        const updatedState = newState instanceof State
            ? newState
            : this._state.withUpdates(newState, {
                timestamp: Date.now(),
                source: metadataOverride?.sourceSystem ?? this.metadata.sourceSystem,
            });
        return new Entity({
            id: this.id,
            type: this.type,
            name: this.name,
            status: statusOverride ?? this.status,
            state: updatedState,
            metadata: {
                ...this.metadata,
                ...metadataOverride,
                version: this.metadata.version + 1,
                updatedAt: Date.now(),
            },
        });
    }
    clone(overrides) {
        return new Entity({
            id: overrides?.id ?? this.id,
            type: overrides?.type ?? this.type,
            name: overrides?.name ?? this.name,
            status: overrides?.status ?? this.status,
            state: overrides?.state ?? this._state,
            metadata: {
                ...this.metadata,
                ...overrides?.metadata,
            },
        });
    }
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            status: this.status,
            state: this._state.toJSON(),
            metadata: this.metadata,
        };
    }
    static fromJSON(json) {
        return new Entity({
            id: json.id,
            type: json.type,
            name: json.name,
            status: json.status,
            state: State.fromJSON(json.state),
            metadata: json.metadata,
        });
    }
}
//# sourceMappingURL=Entity.js.map