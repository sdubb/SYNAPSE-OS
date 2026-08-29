/**
 * @file Entity.ts
 * @description Node representation in the World Engine state graph with type descriptors, property state, and lifecycle tracking.
 */
import { State, type PropertyValue, type StateMetadata } from './State.js';
export type EntityLifecycleStatus = 'active' | 'degraded' | 'inactive' | 'archived' | 'simulated';
export interface EntityMetadata {
    readonly tenantId?: string;
    readonly namespace?: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly version: number;
    readonly confidenceScore: number;
    readonly tags: readonly string[];
    readonly sourceSystem?: string;
    readonly externalId?: string;
}
export interface EntityConfig {
    readonly id: string;
    readonly type: string;
    readonly name?: string;
    readonly status?: EntityLifecycleStatus;
    readonly state?: State | Record<string, PropertyValue>;
    readonly metadata?: Partial<EntityMetadata>;
}
export declare class Entity {
    readonly id: string;
    readonly type: string;
    readonly name: string;
    readonly status: EntityLifecycleStatus;
    private _state;
    readonly metadata: EntityMetadata;
    constructor(config: EntityConfig);
    get state(): State;
    get properties(): Readonly<Record<string, PropertyValue>>;
    get<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined;
    cloneWithState(newState: State | Record<string, PropertyValue>, metadataOverride?: Partial<EntityMetadata>, statusOverride?: EntityLifecycleStatus): Entity;
    clone(overrides?: Partial<EntityConfig>): Entity;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: {
        id: string;
        type: string;
        name?: string;
        status?: EntityLifecycleStatus;
        state: {
            properties: Record<string, PropertyValue>;
            metadata?: Partial<StateMetadata>;
        };
        metadata?: Partial<EntityMetadata>;
    }): Entity;
}
//# sourceMappingURL=Entity.d.ts.map