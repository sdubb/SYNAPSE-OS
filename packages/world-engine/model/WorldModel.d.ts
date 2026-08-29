/**
 * @file WorldModel.ts
 * @description High-level world container with versioning, tenant scoping, entity-relationship collections, and model lifecycle.
 */
import { Entity } from './Entity.js';
import { Relationship } from './Relationship.js';
import { Constraint, type ConstraintViolation } from './Constraint.js';
import { Behavior } from './Behavior.js';
import type { PropertyValue } from './State.js';
export interface WorldModelMetadata {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly tenantId: string;
    readonly environment: 'production' | 'staging' | 'development' | 'sandbox' | 'simulation';
    readonly version: number;
    readonly schemaVersion: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly author?: string;
    readonly tags: readonly string[];
    readonly customAttributes: Readonly<Record<string, PropertyValue>>;
}
export interface WorldModelConfig {
    readonly id: string;
    readonly name: string;
    readonly tenantId: string;
    readonly description?: string;
    readonly environment?: 'production' | 'staging' | 'development' | 'sandbox' | 'simulation';
    readonly schemaVersion?: string;
    readonly version?: number;
    readonly tags?: readonly string[];
    readonly customAttributes?: Record<string, PropertyValue>;
}
export interface WorldModelValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ConstraintViolation[];
    readonly warnings: readonly ConstraintViolation[];
    readonly checkedEntitiesCount: number;
    readonly checkedRelationshipsCount: number;
    readonly evaluatedConstraintsCount: number;
}
export declare class WorldModel {
    private readonly _metadata;
    private readonly _entities;
    private readonly _relationships;
    private readonly _constraints;
    private readonly _behaviors;
    constructor(config: WorldModelConfig, initialData?: {
        entities?: Iterable<Entity>;
        relationships?: Iterable<Relationship>;
        constraints?: Iterable<Constraint>;
        behaviors?: Iterable<Behavior>;
        metadata?: Partial<WorldModelMetadata>;
    });
    get metadata(): WorldModelMetadata;
    get id(): string;
    get tenantId(): string;
    get name(): string;
    get version(): number;
    get entityCount(): number;
    get relationshipCount(): number;
    get constraintCount(): number;
    get behaviorCount(): number;
    getEntity(id: string): Entity | undefined;
    hasEntity(id: string): boolean;
    getAllEntities(): Entity[];
    getEntitiesByType(type: string): Entity[];
    getEntitiesByTag(tag: string): Entity[];
    getRelationship(id: string): Relationship | undefined;
    getAllRelationships(): Relationship[];
    getRelationshipsForEntity(entityId: string): Relationship[];
    getOutboundRelationships(entityId: string, relationType?: string): Relationship[];
    getInboundRelationships(entityId: string, relationType?: string): Relationship[];
    getConstraints(): Constraint[];
    getBehaviors(): Behavior[];
    getBehaviorsForEntityAndEvent(entityType: string, eventType: string): Behavior[];
    withEntity(entity: Entity): WorldModel;
    withEntities(entities: Iterable<Entity>): WorldModel;
    withoutEntity(entityId: string, cascadeRemoveRelationships?: boolean): WorldModel;
    withRelationship(relationship: Relationship): WorldModel;
    withRelationships(relationships: Iterable<Relationship>): WorldModel;
    withoutRelationship(relationshipId: string): WorldModel;
    withConstraint(constraint: Constraint): WorldModel;
    withBehavior(behavior: Behavior): WorldModel;
    validate(): WorldModelValidationResult;
    clone(overrides?: Partial<WorldModelConfig>): WorldModel;
    toJSON(): Record<string, unknown>;
    private createFork;
}
//# sourceMappingURL=WorldModel.d.ts.map