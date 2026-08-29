/**
 * @file RelationshipExtractor.ts
 * @description Automatically discovers and extracts relationships, foreign key linkages, and references between entities.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
export interface RelationshipRule {
    readonly relationType: string;
    readonly sourceEntityType: string;
    readonly targetEntityType: string;
    readonly foreignKeyField: string;
    readonly targetIdResolver?: (sourceValue: unknown, allEntities: ReadonlyMap<string, Entity>) => string | undefined;
    readonly weight?: number;
    readonly bidirectional?: boolean;
}
export declare class RelationshipExtractor {
    private readonly _rules;
    registerRule(rule: RelationshipRule): this;
    /**
     * Discovers relationships from a set of entities using registered rules and automatic FK matching heuristics.
     */
    extractRelationships(entities: Entity[]): Relationship[];
    /**
     * Infers network/call relationships from log interaction pairs.
     */
    extractFromInteractions(interactions: Array<{
        callerId: string;
        calleeId: string;
        callCount?: number;
        avgLatencyMs?: number;
    }>): Relationship[];
}
//# sourceMappingURL=RelationshipExtractor.d.ts.map