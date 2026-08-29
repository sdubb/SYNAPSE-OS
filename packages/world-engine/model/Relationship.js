/**
 * @file Relationship.ts
 * @description Directed edge representation in the World Engine state graph connecting entities with types, weights, and constraints.
 */
export class Relationship {
    id;
    sourceId;
    targetId;
    relationType;
    weight;
    bidirectional;
    attributes;
    metadata;
    constructor(config) {
        if (!config.sourceId || typeof config.sourceId !== 'string') {
            throw new Error('Relationship must specify a sourceId');
        }
        if (!config.targetId || typeof config.targetId !== 'string') {
            throw new Error('Relationship must specify a targetId');
        }
        if (!config.relationType || typeof config.relationType !== 'string') {
            throw new Error('Relationship must specify a relationType');
        }
        this.sourceId = config.sourceId;
        this.targetId = config.targetId;
        this.relationType = config.relationType;
        this.weight = config.weight ?? 1.0;
        this.bidirectional = config.bidirectional ?? false;
        this.attributes = Object.freeze(config.attributes ? { ...config.attributes } : {});
        const now = Date.now();
        this.metadata = Object.freeze({
            createdAt: config.metadata?.createdAt ?? now,
            updatedAt: config.metadata?.updatedAt ?? now,
            confidenceScore: config.metadata?.confidenceScore ?? 1.0,
            sourceSystem: config.metadata?.sourceSystem,
            tenantId: config.metadata?.tenantId,
            tags: Object.freeze(config.metadata?.tags ? [...config.metadata.tags] : []),
        });
        this.id = config.id ?? `${this.sourceId}-[${this.relationType}]->${this.targetId}`;
    }
    getAttribute(key, defaultValue) {
        const value = this.attributes[key];
        return value !== undefined ? value : defaultValue;
    }
    clone(overrides) {
        return new Relationship({
            id: overrides?.id ?? this.id,
            sourceId: overrides?.sourceId ?? this.sourceId,
            targetId: overrides?.targetId ?? this.targetId,
            relationType: overrides?.relationType ?? this.relationType,
            weight: overrides?.weight ?? this.weight,
            bidirectional: overrides?.bidirectional ?? this.bidirectional,
            attributes: overrides?.attributes ?? { ...this.attributes },
            metadata: {
                ...this.metadata,
                ...overrides?.metadata,
                updatedAt: Date.now(),
            },
        });
    }
    toJSON() {
        return {
            id: this.id,
            sourceId: this.sourceId,
            targetId: this.targetId,
            relationType: this.relationType,
            weight: this.weight,
            bidirectional: this.bidirectional,
            attributes: this.attributes,
            metadata: this.metadata,
        };
    }
    static fromJSON(json) {
        return new Relationship(json);
    }
}
//# sourceMappingURL=Relationship.js.map