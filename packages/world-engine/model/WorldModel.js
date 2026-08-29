/**
 * @file WorldModel.ts
 * @description High-level world container with versioning, tenant scoping, entity-relationship collections, and model lifecycle.
 */
export class WorldModel {
    _metadata;
    _entities;
    _relationships;
    _constraints;
    _behaviors;
    constructor(config, initialData) {
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
    get metadata() {
        return this._metadata;
    }
    get id() {
        return this._metadata.id;
    }
    get tenantId() {
        return this._metadata.tenantId;
    }
    get name() {
        return this._metadata.name;
    }
    get version() {
        return this._metadata.version;
    }
    get entityCount() {
        return this._entities.size;
    }
    get relationshipCount() {
        return this._relationships.size;
    }
    get constraintCount() {
        return this._constraints.size;
    }
    get behaviorCount() {
        return this._behaviors.size;
    }
    // --- Entity operations ---
    getEntity(id) {
        return this._entities.get(id);
    }
    hasEntity(id) {
        return this._entities.has(id);
    }
    getAllEntities() {
        return Array.from(this._entities.values());
    }
    getEntitiesByType(type) {
        const results = [];
        for (const entity of this._entities.values()) {
            if (entity.type === type) {
                results.push(entity);
            }
        }
        return results;
    }
    getEntitiesByTag(tag) {
        const results = [];
        for (const entity of this._entities.values()) {
            if (entity.metadata.tags.includes(tag)) {
                results.push(entity);
            }
        }
        return results;
    }
    // --- Relationship operations ---
    getRelationship(id) {
        return this._relationships.get(id);
    }
    getAllRelationships() {
        return Array.from(this._relationships.values());
    }
    getRelationshipsForEntity(entityId) {
        const results = [];
        for (const rel of this._relationships.values()) {
            if (rel.sourceId === entityId || rel.targetId === entityId) {
                results.push(rel);
            }
        }
        return results;
    }
    getOutboundRelationships(entityId, relationType) {
        const results = [];
        for (const rel of this._relationships.values()) {
            if (rel.sourceId === entityId || (rel.bidirectional && rel.targetId === entityId)) {
                if (!relationType || rel.relationType === relationType) {
                    results.push(rel);
                }
            }
        }
        return results;
    }
    getInboundRelationships(entityId, relationType) {
        const results = [];
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
    getConstraints() {
        return Array.from(this._constraints.values());
    }
    getBehaviors() {
        return Array.from(this._behaviors.values());
    }
    getBehaviorsForEntityAndEvent(entityType, eventType) {
        const matches = [];
        for (const b of this._behaviors.values()) {
            if (b.enabled &&
                (b.targetEntityTypes.includes('*') || b.targetEntityTypes.includes(entityType)) &&
                (b.triggerEventTypes.includes('*') || b.triggerEventTypes.includes(eventType))) {
                matches.push(b);
            }
        }
        return matches.sort((a, b) => b.priority - a.priority);
    }
    // --- Immutable Mutation Methods (Returning new WorldModel with incremented version) ---
    withEntity(entity) {
        const newEntities = new Map(this._entities);
        newEntities.set(entity.id, entity);
        return this.createFork(newEntities, this._relationships);
    }
    withEntities(entities) {
        const newEntities = new Map(this._entities);
        for (const entity of entities) {
            newEntities.set(entity.id, entity);
        }
        return this.createFork(newEntities, this._relationships);
    }
    withoutEntity(entityId, cascadeRemoveRelationships = true) {
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
    withRelationship(relationship) {
        const newRels = new Map(this._relationships);
        newRels.set(relationship.id, relationship);
        return this.createFork(this._entities, newRels);
    }
    withRelationships(relationships) {
        const newRels = new Map(this._relationships);
        for (const rel of relationships) {
            newRels.set(rel.id, rel);
        }
        return this.createFork(this._entities, newRels);
    }
    withoutRelationship(relationshipId) {
        const newRels = new Map(this._relationships);
        newRels.delete(relationshipId);
        return this.createFork(this._entities, newRels);
    }
    withConstraint(constraint) {
        const newConstraints = new Map(this._constraints);
        newConstraints.set(constraint.id, constraint);
        return new WorldModel({
            id: this.id,
            name: this.name,
            tenantId: this.tenantId,
            description: this.metadata.description,
            environment: this.metadata.environment,
            schemaVersion: this.metadata.schemaVersion,
            version: this.version + 1,
            tags: this.metadata.tags,
            customAttributes: this.metadata.customAttributes,
        }, {
            entities: this._entities.values(),
            relationships: this._relationships.values(),
            constraints: newConstraints.values(),
            behaviors: this._behaviors.values(),
            metadata: {
                ...this.metadata,
                updatedAt: Date.now(),
            },
        });
    }
    withBehavior(behavior) {
        const newBehaviors = new Map(this._behaviors);
        newBehaviors.set(behavior.id, behavior);
        return new WorldModel({
            id: this.id,
            name: this.name,
            tenantId: this.tenantId,
            description: this.metadata.description,
            environment: this.metadata.environment,
            schemaVersion: this.metadata.schemaVersion,
            version: this.version + 1,
            tags: this.metadata.tags,
            customAttributes: this.metadata.customAttributes,
        }, {
            entities: this._entities.values(),
            relationships: this._relationships.values(),
            constraints: this._constraints.values(),
            behaviors: newBehaviors.values(),
            metadata: {
                ...this.metadata,
                updatedAt: Date.now(),
            },
        });
    }
    validate() {
        const errors = [];
        const warnings = [];
        let evaluatedCount = 0;
        for (const constraint of this._constraints.values()) {
            if (!constraint.enabled)
                continue;
            evaluatedCount++;
            // Entity-level validation
            if (constraint.scope === 'entity') {
                for (const entity of this._entities.values()) {
                    const violation = constraint.validateEntity(entity);
                    if (violation) {
                        if (violation.severity === 'error' || violation.severity === 'critical') {
                            errors.push(violation);
                        }
                        else {
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
                        }
                        else {
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
                    }
                    else {
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
    clone(overrides) {
        return new WorldModel({
            id: overrides?.id ?? this.id,
            name: overrides?.name ?? this.name,
            tenantId: overrides?.tenantId ?? this.tenantId,
            description: overrides?.description ?? this.metadata.description,
            environment: overrides?.environment ?? this.metadata.environment,
            schemaVersion: overrides?.schemaVersion ?? this.metadata.schemaVersion,
            version: overrides?.version ?? this.version,
            tags: overrides?.tags ?? this.metadata.tags,
            customAttributes: overrides?.customAttributes ?? this.metadata.customAttributes,
        }, {
            entities: Array.from(this._entities.values()).map((e) => e.clone()),
            relationships: Array.from(this._relationships.values()).map((r) => r.clone()),
            constraints: Array.from(this._constraints.values()),
            behaviors: Array.from(this._behaviors.values()),
            metadata: {
                ...this.metadata,
                updatedAt: Date.now(),
            },
        });
    }
    toJSON() {
        return {
            metadata: this._metadata,
            entities: Array.from(this._entities.values()).map((e) => e.toJSON()),
            relationships: Array.from(this._relationships.values()).map((r) => r.toJSON()),
        };
    }
    createFork(entities, relationships) {
        return new WorldModel({
            id: this.id,
            name: this.name,
            tenantId: this.tenantId,
            description: this.metadata.description,
            environment: this.metadata.environment,
            schemaVersion: this.metadata.schemaVersion,
            version: this.version + 1,
            tags: this.metadata.tags,
            customAttributes: this.metadata.customAttributes,
        }, {
            entities: entities.values(),
            relationships: relationships.values(),
            constraints: this._constraints.values(),
            behaviors: this._behaviors.values(),
            metadata: {
                ...this.metadata,
                updatedAt: Date.now(),
            },
        });
    }
}
//# sourceMappingURL=WorldModel.js.map