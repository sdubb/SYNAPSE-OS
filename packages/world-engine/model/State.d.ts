/**
 * @file State.ts
 * @description Entity state snapshot and property bag with versioning, immutability, and change diffing.
 */
export type PropertyValue = string | number | boolean | null | undefined | PropertyValue[] | {
    [key: string]: PropertyValue;
};
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
    readonly updated: Record<string, {
        from: PropertyValue;
        to: PropertyValue;
    }>;
    readonly deleted: string[];
    readonly hasChanges: boolean;
}
export declare class State {
    private readonly _properties;
    private readonly _metadata;
    constructor(properties?: Record<string, PropertyValue>, metadata?: Partial<StateMetadata>);
    get properties(): Readonly<Record<string, PropertyValue>>;
    get metadata(): StateMetadata;
    get version(): number;
    get timestamp(): number;
    get source(): string;
    get<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined;
    has(key: string): boolean;
    getNested<T extends PropertyValue = PropertyValue>(path: string, defaultValue?: T): T | undefined;
    withUpdates(updates: Record<string, PropertyValue>, metadataUpdate?: Partial<StateMetadata>): State;
    without(keys: string[], metadataUpdate?: Partial<StateMetadata>): State;
    diff(other: State): StateDiff;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: {
        properties: Record<string, PropertyValue>;
        metadata?: Partial<StateMetadata>;
    }): State;
    private calculateChecksum;
    private static deepClone;
    private static deepEqual;
}
//# sourceMappingURL=State.d.ts.map