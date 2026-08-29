/**
 * @file Constraint.ts
 * @description Invariants, relational rules, and semantic validation rules enforced on world model entities and relationships.
 */

import type { Entity } from './Entity.js';
import type { Relationship } from './Relationship.js';
import type { PropertyValue } from './State.js';

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

export type EntityPredicate = (entity: Entity) => boolean | { valid: boolean; message?: string; details?: Record<string, unknown> };
export type RelationshipPredicate = (relationship: Relationship, sourceEntity?: Entity, targetEntity?: Entity) => boolean | { valid: boolean; message?: string; details?: Record<string, unknown> };
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

export class Constraint {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly severity: ConstraintSeverity;
  public readonly scope: ConstraintScope;
  public readonly entityTypes: readonly string[];
  public readonly relationTypes: readonly string[];
  public readonly enabled: boolean;

  private readonly _entityValidator?: EntityPredicate;
  private readonly _relationshipValidator?: RelationshipPredicate;
  private readonly _graphValidator?: GraphPredicate;

  constructor(
    config: ConstraintConfig,
    validators: {
      entityValidator?: EntityPredicate;
      relationshipValidator?: RelationshipPredicate;
      graphValidator?: GraphPredicate;
    } = {}
  ) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.severity = config.severity;
    this.scope = config.scope;
    this.entityTypes = Object.freeze(config.entityTypes ? [...config.entityTypes] : []);
    this.relationTypes = Object.freeze(config.relationTypes ? [...config.relationTypes] : []);
    this.enabled = config.enabled ?? true;

    this._entityValidator = validators.entityValidator;
    this._relationshipValidator = validators.relationshipValidator;
    this._graphValidator = validators.graphValidator;
  }

  public validateEntity(entity: Entity): ConstraintViolation | null {
    if (!this.enabled || this.scope !== 'entity' || !this._entityValidator) {
      return null;
    }

    if (this.entityTypes.length > 0 && !this.entityTypes.includes(entity.type)) {
      return null;
    }

    const result = this._entityValidator(entity);
    if (typeof result === 'boolean') {
      if (!result) {
        return {
          constraintId: this.id,
          constraintName: this.name,
          severity: this.severity,
          message: `Constraint '${this.name}' failed on entity ${entity.id} (${entity.type})`,
          targetId: entity.id,
          targetType: 'entity',
          timestamp: Date.now(),
        };
      }
      return null;
    }

    if (!result.valid) {
      return {
        constraintId: this.id,
        constraintName: this.name,
        severity: this.severity,
        message: result.message ?? `Constraint '${this.name}' failed on entity ${entity.id}`,
        targetId: entity.id,
        targetType: 'entity',
        details: result.details,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  public validateRelationship(
    relationship: Relationship,
    sourceEntity?: Entity,
    targetEntity?: Entity
  ): ConstraintViolation | null {
    if (!this.enabled || this.scope !== 'relationship' || !this._relationshipValidator) {
      return null;
    }

    if (this.relationTypes.length > 0 && !this.relationTypes.includes(relationship.relationType)) {
      return null;
    }

    const result = this._relationshipValidator(relationship, sourceEntity, targetEntity);
    if (typeof result === 'boolean') {
      if (!result) {
        return {
          constraintId: this.id,
          constraintName: this.name,
          severity: this.severity,
          message: `Constraint '${this.name}' failed on relationship ${relationship.id} (${relationship.relationType})`,
          targetId: relationship.id,
          targetType: 'relationship',
          timestamp: Date.now(),
        };
      }
      return null;
    }

    if (!result.valid) {
      return {
        constraintId: this.id,
        constraintName: this.name,
        severity: this.severity,
        message: result.message ?? `Constraint '${this.name}' failed on relationship ${relationship.id}`,
        targetId: relationship.id,
        targetType: 'relationship',
        details: result.details,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  public validateGraph(
    entities: ReadonlyMap<string, Entity>,
    relationships: readonly Relationship[]
  ): ConstraintViolation[] {
    if (!this.enabled || (this.scope !== 'global' && this.scope !== 'graph') || !this._graphValidator) {
      return [];
    }
    return this._graphValidator(entities, relationships);
  }

  public static requiredProperties(
    id: string,
    name: string,
    entityTypes: string[],
    requiredKeys: string[],
    severity: ConstraintSeverity = 'error'
  ): Constraint {
    return new Constraint(
      {
        id,
        name,
        description: `Ensures entity has required properties: ${requiredKeys.join(', ')}`,
        severity,
        scope: 'entity',
        entityTypes,
      },
      {
        entityValidator: (entity: Entity) => {
          const missing = requiredKeys.filter((key) => !entity.state.has(key));
          if (missing.length > 0) {
            return {
              valid: false,
              message: `Missing required property(ies): ${missing.join(', ')}`,
              details: { missingProperties: missing },
            };
          }
          return true;
        },
      }
    );
  }

  public static propertyType(
    id: string,
    name: string,
    entityTypes: string[],
    propertyKey: string,
    expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array',
    severity: ConstraintSeverity = 'error'
  ): Constraint {
    return new Constraint(
      {
        id,
        name,
        description: `Ensures property ${propertyKey} has type ${expectedType}`,
        severity,
        scope: 'entity',
        entityTypes,
      },
      {
        entityValidator: (entity: Entity) => {
          const val = entity.state.get(propertyKey);
          if (val === undefined || val === null) return true; // Property requirement checked separately
          const actualType = Array.isArray(val) ? 'array' : typeof val;
          if (actualType !== expectedType) {
            return {
              valid: false,
              message: `Property '${propertyKey}' expected type ${expectedType} but got ${actualType}`,
              details: { propertyKey, expectedType, actualType, actualValue: val as PropertyValue },
            };
          }
          return true;
        },
      }
    );
  }

  public static noDanglingRelationships(id = 'graph-no-dangling', severity: ConstraintSeverity = 'critical'): Constraint {
    return new Constraint(
      {
        id,
        name: 'No Dangling Relationships',
        description: 'Verifies that every relationship references existing source and target entities in the graph',
        severity,
        scope: 'graph',
      },
      {
        graphValidator: (entities: ReadonlyMap<string, Entity>, relationships: readonly Relationship[]) => {
          const violations: ConstraintViolation[] = [];
          for (const rel of relationships) {
            if (!entities.has(rel.sourceId)) {
              violations.push({
                constraintId: id,
                constraintName: 'No Dangling Relationships',
                severity,
                message: `Relationship ${rel.id} (${rel.relationType}) source entity ${rel.sourceId} does not exist in graph`,
                targetId: rel.id,
                targetType: 'relationship',
                details: { missingSide: 'source', sourceId: rel.sourceId, targetId: rel.targetId },
                timestamp: Date.now(),
              });
            }
            if (!entities.has(rel.targetId)) {
              violations.push({
                constraintId: id,
                constraintName: 'No Dangling Relationships',
                severity,
                message: `Relationship ${rel.id} (${rel.relationType}) target entity ${rel.targetId} does not exist in graph`,
                targetId: rel.id,
                targetType: 'relationship',
                details: { missingSide: 'target', sourceId: rel.sourceId, targetId: rel.targetId },
                timestamp: Date.now(),
              });
            }
          }
          return violations;
        },
      }
    );
  }
}
