/**
 * @file State.ts
 * @description Entity state snapshot and property bag with versioning, immutability, and change diffing.
 */

export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | PropertyValue[]
  | { [key: string]: PropertyValue };

export interface StateMetadata {
  readonly version: number;
  readonly timestamp: number;
  readonly source: string;
  readonly checksum?: string;
  readonly authorId?: string;
  readonly reason?: string;
}

export interface StateDiff {
  readonly added: Record<string, PropertyValue>;
  readonly updated: Record<string, { from: PropertyValue; to: PropertyValue }>;
  readonly deleted: string[];
  readonly hasChanges: boolean;
}

export class State {
  private readonly _properties: Readonly<Record<string, PropertyValue>>;
  private readonly _metadata: StateMetadata;

  constructor(
    properties: Record<string, PropertyValue> = {},
    metadata?: Partial<StateMetadata>
  ) {
    this._properties = Object.freeze(State.deepClone(properties));
    this._metadata = Object.freeze({
      version: metadata?.version ?? 1,
      timestamp: metadata?.timestamp ?? Date.now(),
      source: metadata?.source ?? 'system',
      checksum: metadata?.checksum ?? this.calculateChecksum(this._properties),
      authorId: metadata?.authorId,
      reason: metadata?.reason,
    });
  }

  public get properties(): Readonly<Record<string, PropertyValue>> {
    return this._properties;
  }

  public get metadata(): StateMetadata {
    return this._metadata;
  }

  public get version(): number {
    return this._metadata.version;
  }

  public get timestamp(): number {
    return this._metadata.timestamp;
  }

  public get source(): string {
    return this._metadata.source;
  }

  public get<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined {
    const value = this._properties[key];
    return (value !== undefined ? (value as T) : defaultValue);
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this._properties, key);
  }

  public getNested<T extends PropertyValue = PropertyValue>(path: string, defaultValue?: T): T | undefined {
    const segments = path.split('.');
    let current: unknown = this._properties;

    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return (current !== undefined ? (current as T) : defaultValue);
  }

  public withUpdates(
    updates: Record<string, PropertyValue>,
    metadataUpdate?: Partial<StateMetadata>
  ): State {
    const newProps = {
      ...this._properties,
      ...State.deepClone(updates),
    };

    return new State(newProps, {
      ...this._metadata,
      ...metadataUpdate,
      version: this._metadata.version + 1,
      timestamp: metadataUpdate?.timestamp ?? Date.now(),
    });
  }

  public without(keys: string[], metadataUpdate?: Partial<StateMetadata>): State {
    const newProps = { ...this._properties };
    for (const key of keys) {
      delete newProps[key];
    }

    return new State(newProps, {
      ...this._metadata,
      ...metadataUpdate,
      version: this._metadata.version + 1,
      timestamp: metadataUpdate?.timestamp ?? Date.now(),
    });
  }

  public diff(other: State): StateDiff {
    const added: Record<string, PropertyValue> = {};
    const updated: Record<string, { from: PropertyValue; to: PropertyValue }> = {};
    const deleted: string[] = [];

    const thisKeys = new Set(Object.keys(this._properties));
    const otherKeys = new Set(Object.keys(other._properties));

    for (const key of otherKeys) {
      if (!thisKeys.has(key)) {
        added[key] = other._properties[key]!;
      } else {
        const valA = this._properties[key];
        const valB = other._properties[key];
        if (!State.deepEqual(valA, valB)) {
          updated[key] = { from: valA!, to: valB! };
        }
      }
    }

    for (const key of thisKeys) {
      if (!otherKeys.has(key)) {
        deleted.push(key);
      }
    }

    const hasChanges = Object.keys(added).length > 0 || Object.keys(updated).length > 0 || deleted.length > 0;

    return { added, updated, deleted, hasChanges };
  }

  public toJSON(): Record<string, unknown> {
    return {
      properties: this._properties,
      metadata: this._metadata,
    };
  }

  public static fromJSON(json: { properties: Record<string, PropertyValue>; metadata?: Partial<StateMetadata> }): State {
    return new State(json.properties, json.metadata);
  }

  private calculateChecksum(props: Record<string, PropertyValue>): string {
    const serialized = JSON.stringify(props, Object.keys(props).sort());
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `chk_${Math.abs(hash).toString(16)}`;
  }

  private static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => State.deepClone(item)) as unknown as T;
    }
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      copy[key] = State.deepClone((obj as Record<string, unknown>)[key]);
    }
    return copy as T;
  }

  private static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!State.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!State.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }
}
