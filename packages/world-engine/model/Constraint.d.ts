/**
 * @file Constraint.ts
 * @description Invariants, relational rules, and semantic validation rules enforced on world model entities and relationships.
 */
import type { Entity } from './Entity.js';
import type { Relationship } from './Relationship.js';
export type ConstraintSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ConstraintScope = 'entity' | 'relationship' | 'global' | 'graph';
export interface ConstraintViolation {
    readonly constraintId: string;
    readonly constraintName: string;
    readonly severity: ConstraintSeverity;
    readonly message: string;
    readonly targetId: string;
    readonly targetType: ConstraintScope;
    readonly details?: Record<string, unknown>;
    readonly timestamp: number;
}
export type EntityPredicate = (entity: Entity) => boolean | {
    valid: boolean;
    message?: string;
    details?: Record<string, unknown>;
};
export type RelationshipPredicate = (relationship: Relationship, sourceEntity?: Entity, targetEntity?: Entity) => boolean | {
    valid: boolean;
    message?: string;
    details?: Record<string, unknown>;
};
export type GraphPredicate = (entities: ReadonlyMap<string, Entity>, relationships: readonly Relationship[]) => ConstraintViolation[];
export interface ConstraintConfig {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly severity: ConstraintSeverity;
    readonly scope: ConstraintScope;
    readonly entityTypes?: readonly string[];
    readonly relationTypes?: readonly string[];
    readonly enabled?: boolean;
}
export declare class Constraint {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly severity: ConstraintSeverity;
    readonly scope: ConstraintScope;
    readonly entityTypes: readonly string[];
    readonly relationTypes: readonly string[];
    readonly enabled: boolean;
    private readonly _entityValidator?;
    private readonly _relationshipValidator?;
    private readonly _graphValidator?;
    constructor(config: ConstraintConfig, validators?: {
        entityValidator?: EntityPredicate;
        relationshipValidator?: RelationshipPredicate;
        graphValidator?: GraphPredicate;
    });
    validateEntity(entity: Entity): ConstraintViolation | null;
    validateRelationship(relationship: Relationship, sourceEntity?: Entity, targetEntity?: Entity): ConstraintViolation | null;
    validateGraph(entities: ReadonlyMap<string, Entity>, relationships: readonly Relationship[]): ConstraintViolation[];
    static requiredProperties(id: string, name: string, entityTypes: string[], requiredKeys: string[], severity?: ConstraintSeverity): Constraint;
    static propertyType(id: string, name: string, entityTypes: string[], propertyKey: string, expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array', severity?: ConstraintSeverity): Constraint;
    static noDanglingRelationships(id?: string, severity?: ConstraintSeverity): Constraint;
}
//# sourceMappingURL=Constraint.d.ts.map