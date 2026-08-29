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

export class Entity {
  public readonly id: string;
  public readonly type: string;
  public readonly name: string;
  public readonly status: EntityLifecycleStatus;
  private _state: State;
  public readonly metadata: EntityMetadata;

  constructor(config: EntityConfig) {
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
    } else {
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

  public get state(): State {
    return this._state;
  }

  public get properties(): Readonly<Record<string, PropertyValue>> {
    return this._state.properties;
  }

  public get<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined {
    return this._state.get<T>(key, defaultValue);
  }

  public cloneWithState(
    newState: State | Record<string, PropertyValue>,
    metadataOverride?: Partial<EntityMetadata>,
    statusOverride?: EntityLifecycleStatus
  ): Entity {
    const updatedState =
      newState instanceof State
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

  public clone(overrides?: Partial<EntityConfig>): Entity {
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

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      status: this.status,
      state: this._state.toJSON(),
      metadata: this.metadata,
    };
  }

  public static fromJSON(json: {
    id: string;
    type: string;
    name?: string;
    status?: EntityLifecycleStatus;
    state: { properties: Record<string, PropertyValue>; metadata?: Partial<StateMetadata> };
    metadata?: Partial<EntityMetadata>;
  }): Entity {
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
