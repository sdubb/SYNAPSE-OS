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

export class WorldModel {
  private readonly _metadata: WorldModelMetadata;
  private readonly _entities: Map<string, Entity>;
  private readonly _relationships: Map<string, Relationship>;
  private readonly _constraints: Map<string, Constraint>;
  private readonly _behaviors: Map<string, Behavior>;

  constructor(
    config: WorldModelConfig,
    initialData?: {
      entities?: Iterable<Entity>;
      relationships?: Iterable<Relationship>;
      constraints?: Iterable<Constraint>;
      behaviors?: Iterable<Behavior>;
      metadata?: Partial<WorldModelMetadata>;
    }
  ) {
    const now = Date.now();
    this._metadata = Object.freeze({
      id: config.id,
      name: config.name,
      description: config.description,
      tenantId: config.tenantId,
      environment: config.environment ?? 'production',
      version: config.version ?? 1,
      schemaVersion: config.schemaVersion ?? '1.0.0',
      createdAt: initialData?.metadata?.createdAt ?? now,
      updatedAt: initialData?.metadata?.updatedAt ?? now,
      author: initialData?.metadata?.author,
      tags: Object.freeze(config.tags ? [...config.tags] : []),
      customAttributes: Object.freeze(config.customAttributes ? { ...config.customAttributes } : {}),
    });

    this._entities = new Map();
    this._relationships = new Map();
    this._constraints = new Map();
    this._behaviors = new Map();

    if (initialData?.entities) {
      for (const e of initialData.entities) {
        this._entities.set(e.id, e);
      }
    }

    if (initialData?.relationships) {
      for (const r of initialData.relationships) {
        this._relationships.set(r.id, r);
      }
    }

    if (initialData?.constraints) {
      for (const c of initialData.constraints) {
        this._constraints.set(c.id, c);
      }
    }

    if (initialData?.behaviors) {
      for (const b of initialData.behaviors) {
        this._behaviors.set(b.id, b);
      }
    }
  }

  public get metadata(): WorldModelMetadata {
    return this._metadata;
  }

  public get id(): string {
    return this._metadata.id;
  }

  public get tenantId(): string {
    return this._metadata.tenantId;
  }

  public get name(): string {
    return this._metadata.name;
  }

  public get version(): number {
    return this._metadata.version;
  }

  public get entityCount(): number {
    return this._entities.size;
  }

  public get relationshipCount(): number {
    return this._relationships.size;
  }

  public get constraintCount(): number {
    return this._constraints.size;
  }

  public get behaviorCount(): number {
    return this._behaviors.size;
  }

  // --- Entity operations ---

  public getEntity(id: string): Entity | undefined {
    return this._entities.get(id);
  }

  public hasEntity(id: string): boolean {
    return this._entities.has(id);
  }

  public getAllEntities(): Entity[] {
    return Array.from(this._entities.values());
  }

  public getEntitiesByType(type: string): Entity[] {
    const results: Entity[] = [];
    for (const entity of this._entities.values()) {
      if (entity.type === type) {
        results.push(entity);
      }
    }
    return results;
  }

  public getEntitiesByTag(tag: string): Entity[] {
    const results: Entity[] = [];
    for (const entity of this._entities.values()) {
      if (entity.metadata.tags.includes(tag)) {
        results.push(entity);
      }
    }
    return results;
  }

  // --- Relationship operations ---

  public getRelationship(id: string): Relationship | undefined {
    return this._relationships.get(id);
  }

  public getAllRelationships(): Relationship[] {
    return Array.from(this._relationships.values());
  }

  public getRelationshipsForEntity(entityId: string): Relationship[] {
    const results: Relationship[] = [];
    for (const rel of this._relationships.values()) {
      if (rel.sourceId === entityId || rel.targetId === entityId) {
        results.push(rel);
      }
    }
    return results;
  }

  public getOutboundRelationships(entityId: string, relationType?: string): Relationship[] {
    const results: Relationship[] = [];
    for (const rel of this._relationships.values()) {
      if (rel.sourceId === entityId || (rel.bidirectional && rel.targetId === entityId)) {
        if (!relationType || rel.relationType === relationType) {
          results.push(rel);
        }
      }
    }
    return results;
  }

  public getInboundRelationships(entityId: string, relationType?: string): Relationship[] {
    const results: Relationship[] = [];
    for (const rel of this._relationships.values()) {
      if (rel.targetId === entityId || (rel.bidirectional && rel.sourceId === entityId)) {
        if (!relationType || rel.relationType === relationType) {
          results.push(rel);
        }
      }
    }
    return results;
  }

  // --- Constraints and Behaviors ---

  public getConstraints(): Constraint[] {
    return Array.from(this._constraints.values());
  }

  public getBehaviors(): Behavior[] {
    return Array.from(this._behaviors.values());
  }

  public getBehaviorsForEntityAndEvent(entityType: string, eventType: string): Behavior[] {
    const matches: Behavior[] = [];
    for (const b of this._behaviors.values()) {
      if (
        b.enabled &&
        (b.targetEntityTypes.includes('*') || b.targetEntityTypes.includes(entityType)) &&
        (b.triggerEventTypes.includes('*') || b.triggerEventTypes.includes(eventType))
      ) {
        matches.push(b);
      }
    }
    return matches.sort((a, b) => b.priority - a.priority);
  }

  // --- Immutable Mutation Methods (Returning new WorldModel with incremented version) ---

  public withEntity(entity: Entity): WorldModel {
    const newEntities = new Map(this._entities);
    newEntities.set(entity.id, entity);

    return this.createFork(newEntities, this._relationships);
  }

  public withEntities(entities: Iterable<Entity>): WorldModel {
    const newEntities = new Map(this._entities);
    for (const entity of entities) {
      newEntities.set(entity.id, entity);
    }
    return this.createFork(newEntities, this._relationships);
  }

  public withoutEntity(entityId: string, cascadeRemoveRelationships = true): WorldModel {
    const newEntities = new Map(this._entities);
    newEntities.delete(entityId);

    const newRels = new Map(this._relationships);
    if (cascadeRemoveRelationships) {
      for (const [id, rel] of this._relationships) {
        if (rel.sourceId === entityId || rel.targetId === entityId) {
          newRels.delete(id);
        }
      }
    }

    return this.createFork(newEntities, newRels);
  }

  public withRelationship(relationship: Relationship): WorldModel {
    const newRels = new Map(this._relationships);
    newRels.set(relationship.id, relationship);
    return this.createFork(this._entities, newRels);
  }

  public withRelationships(relationships: Iterable<Relationship>): WorldModel {
    const newRels = new Map(this._relationships);
    for (const rel of relationships) {
      newRels.set(rel.id, rel);
    }
    return this.createFork(this._entities, newRels);
  }

  public withoutRelationship(relationshipId: string): WorldModel {
    const newRels = new Map(this._relationships);
    newRels.delete(relationshipId);
    return this.createFork(this._entities, newRels);
  }

  public withConstraint(constraint: Constraint): WorldModel {
    const newConstraints = new Map(this._constraints);
    newConstraints.set(constraint.id, constraint);
    return new WorldModel(
      {
        id: this.id,
        name: this.name,
        tenantId: this.tenantId,
        description: this.metadata.description,
        environment: this.metadata.environment,
        schemaVersion: this.metadata.schemaVersion,
        version: this.version + 1,
        tags: this.metadata.tags,
        customAttributes: this.metadata.customAttributes as Record<string, PropertyValue>,
      },
      {
        entities: this._entities.values(),
        relationships: this._relationships.values(),
        constraints: newConstraints.values(),
        behaviors: this._behaviors.values(),
        metadata: {
          ...this.metadata,
          updatedAt: Date.now(),
        },
      }
    );
  }

  public withBehavior(behavior: Behavior): WorldModel {
    const newBehaviors = new Map(this._behaviors);
    newBehaviors.set(behavior.id, behavior);
    return new WorldModel(
      {
        id: this.id,
        name: this.name,
        tenantId: this.tenantId,
        description: this.metadata.description,
        environment: this.metadata.environment,
        schemaVersion: this.metadata.schemaVersion,
        version: this.version + 1,
        tags: this.metadata.tags,
        customAttributes: this.metadata.customAttributes as Record<string, PropertyValue>,
      },
      {
        entities: this._entities.values(),
        relationships: this._relationships.values(),
        constraints: this._constraints.values(),
        behaviors: newBehaviors.values(),
        metadata: {
          ...this.metadata,
          updatedAt: Date.now(),
        },
      }
    );
  }

  public validate(): WorldModelValidationResult {
    const errors: ConstraintViolation[] = [];
    const warnings: ConstraintViolation[] = [];
    let evaluatedCount = 0;

    for (const constraint of this._constraints.values()) {
      if (!constraint.enabled) continue;
      evaluatedCount++;

      // Entity-level validation
      if (constraint.scope === 'entity') {
        for (const entity of this._entities.values()) {
          const violation = constraint.validateEntity(entity);
          if (violation) {
            if (violation.severity === 'error' || violation.severity === 'critical') {
              errors.push(violation);
            } else {
              warnings.push(violation);
            }
          }
        }
      }

      // Relationship-level validation
      if (constraint.scope === 'relationship') {
        for (const rel of this._relationships.values()) {
          const source = this._entities.get(rel.sourceId);
          const target = this._entities.get(rel.targetId);
          const violation = constraint.validateRelationship(rel, source, target);
          if (violation) {
            if (violation.severity === 'error' || violation.severity === 'critical') {
              errors.push(violation);
            } else {
              warnings.push(violation);
            }
          }
        }
      }

      // Graph-level validation
      if (constraint.scope === 'global' || constraint.scope === 'graph') {
        const violations = constraint.validateGraph(this._entities, Array.from(this._relationships.values()));
        for (const violation of violations) {
          if (violation.severity === 'error' || violation.severity === 'critical') {
            errors.push(violation);
          } else {
            warnings.push(violation);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      checkedEntitiesCount: this._entities.size,
      checkedRelationshipsCount: this._relationships.size,
      evaluatedConstraintsCount: evaluatedCount,
    };
  }

  public clone(overrides?: Partial<WorldModelConfig>): WorldModel {
    return new WorldModel(
      {
        id: overrides?.id ?? this.id,
        name: overrides?.name ?? this.name,
        tenantId: overrides?.tenantId ?? this.tenantId,
        description: overrides?.description ?? this.metadata.description,
        environment: overrides?.environment ?? this.metadata.environment,
        schemaVersion: overrides?.schemaVersion ?? this.metadata.schemaVersion,
        version: overrides?.version ?? this.version,
        tags: overrides?.tags ?? this.metadata.tags,
        customAttributes: overrides?.customAttributes ?? (this.metadata.customAttributes as Record<string, PropertyValue>),
      },
      {
        entities: Array.from(this._entities.values()).map((e) => e.clone()),
        relationships: Array.from(this._relationships.values()).map((r) => r.clone()),
        constraints: Array.from(this._constraints.values()),
        behaviors: Array.from(this._behaviors.values()),
        metadata: {
          ...this.metadata,
          updatedAt: Date.now(),
        },
      }
    );
  }

  public toJSON(): Record<string, unknown> {
    return {
      metadata: this._metadata,
      entities: Array.from(this._entities.values()).map((e) => e.toJSON()),
      relationships: Array.from(this._relationships.values()).map((r) => r.toJSON()),
    };
  }

  private createFork(
    entities: Map<string, Entity>,
    relationships: Map<string, Relationship>
  ): WorldModel {
    return new WorldModel(
      {
        id: this.id,
        name: this.name,
        tenantId: this.tenantId,
        description: this.metadata.description,
        environment: this.metadata.environment,
        schemaVersion: this.metadata.schemaVersion,
        version: this.version + 1,
        tags: this.metadata.tags,
        customAttributes: this.metadata.customAttributes as Record<string, PropertyValue>,
      },
      {
        entities: entities.values(),
        relationships: relationships.values(),
        constraints: this._constraints.values(),
        behaviors: this._behaviors.values(),
        metadata: {
          ...this.metadata,
          updatedAt: Date.now(),
        },
      }
    );
  }
}
