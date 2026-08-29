/**
 * @file Constraint.ts
 * @description Invariants, relational rules, and semantic validation rules enforced on world model entities and relationships.
 */
export class Constraint {
    id;
    name;
    description;
    severity;
    scope;
    entityTypes;
    relationTypes;
    enabled;
    _entityValidator;
    _relationshipValidator;
    _graphValidator;
    constructor(config, validators = {}) {
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
    validateEntity(entity) {
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
    validateRelationship(relationship, sourceEntity, targetEntity) {
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
    validateGraph(entities, relationships) {
        if (!this.enabled || (this.scope !== 'global' && this.scope !== 'graph') || !this._graphValidator) {
            return [];
        }
        return this._graphValidator(entities, relationships);
    }
    static requiredProperties(id, name, entityTypes, requiredKeys, severity = 'error') {
        return new Constraint({
            id,
            name,
            description: `Ensures entity has required properties: ${requiredKeys.join(', ')}`,
            severity,
            scope: 'entity',
            entityTypes,
        }, {
            entityValidator: (entity) => {
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
        });
    }
    static propertyType(id, name, entityTypes, propertyKey, expectedType, severity = 'error') {
        return new Constraint({
            id,
            name,
            description: `Ensures property ${propertyKey} has type ${expectedType}`,
            severity,
            scope: 'entity',
            entityTypes,
        }, {
            entityValidator: (entity) => {
                const val = entity.state.get(propertyKey);
                if (val === undefined || val === null)
                    return true; // Property requirement checked separately
                const actualType = Array.isArray(val) ? 'array' : typeof val;
                if (actualType !== expectedType) {
                    return {
                        valid: false,
                        message: `Property '${propertyKey}' expected type ${expectedType} but got ${actualType}`,
                        details: { propertyKey, expectedType, actualType, actualValue: val },
                    };
                }
                return true;
            },
        });
    }
    static noDanglingRelationships(id = 'graph-no-dangling', severity = 'critical') {
        return new Constraint({
            id,
            name: 'No Dangling Relationships',
            description: 'Verifies that every relationship references existing source and target entities in the graph',
            severity,
            scope: 'graph',
        }, {
            graphValidator: (entities, relationships) => {
                const violations = [];
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
        });
    }
}
//# sourceMappingURL=Constraint.js.map