/**
 * @file Relationship.ts
 * @description Directed edge representation in the World Engine state graph connecting entities with types, weights, and constraints.
 */
import type { PropertyValue } from './State.js';
export type RelationshipDirection = 'outbound' | 'inbound' | 'bidirectional';
export interface RelationshipMetadata {
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly confidenceScore: number;
    readonly sourceSystem?: string;
    readonly tenantId?: string;
    readonly tags: readonly string[];
}
export interface RelationshipConfig {
    readonly id?: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly relationType: string;
    readonly weight?: number;
    readonly bidirectional?: boolean;
    readonly attributes?: Record<string, PropertyValue>;
    readonly metadata?: Partial<RelationshipMetadata>;
}
export declare class Relationship {
    readonly id: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly relationType: string;
    readonly weight: number;
    readonly bidirectional: boolean;
    readonly attributes: Readonly<Record<string, PropertyValue>>;
    readonly metadata: RelationshipMetadata;
    constructor(config: RelationshipConfig);
    getAttribute<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined;
    clone(overrides?: Partial<RelationshipConfig>): Relationship;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: {
        id?: string;
        sourceId: string;
        targetId: string;
        relationType: string;
        weight?: number;
        bidirectional?: boolean;
        attributes?: Record<string, PropertyValue>;
        metadata?: Partial<RelationshipMetadata>;
    }): Relationship;
}
//# sourceMappingURL=Relationship.d.ts.map