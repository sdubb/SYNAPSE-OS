/**
 * @file RelationshipExtractor.ts
 * @description Automatically discovers and extracts relationships, foreign key linkages, and references between entities.
 */
import { Relationship } from '../model/Relationship.js';
export class RelationshipExtractor {
    _rules = [];
    registerRule(rule) {
        this._rules.push(rule);
        return this;
    }
    /**
     * Discovers relationships from a set of entities using registered rules and automatic FK matching heuristics.
     */
    extractRelationships(entities) {
        const entityMap = new Map();
        for (const e of entities) {
            entityMap.set(e.id, e);
        }
        const relationships = [];
        const relKeySet = new Set();
        // 1. Process explicit extraction rules
        for (const rule of this._rules) {
            const sourceEntities = entities.filter((e) => e.type === rule.sourceEntityType || rule.sourceEntityType === '*');
            for (const src of sourceEntities) {
                const fkVal = src.state.get(rule.foreignKeyField);
                if (fkVal === undefined || fkVal === null)
                    continue;
                let targetId;
                if (rule.targetIdResolver) {
                    targetId = rule.targetIdResolver(fkVal, entityMap);
                }
                else {
                    const directTarget = String(fkVal);
                    if (entityMap.has(directTarget)) {
                        targetId = directTarget;
                    }
                    else {
                        // Check if entity exists with matching type and ID pattern
                        for (const [id, e] of entityMap) {
                            if ((rule.targetEntityType === '*' || e.type === rule.targetEntityType) &&
                                (id === directTarget || e.metadata.externalId === directTarget || e.name === directTarget)) {
                                targetId = id;
                                break;
                            }
                        }
                    }
                }
                if (targetId && entityMap.has(targetId)) {
                    const relKey = `${src.id}->${rule.relationType}->${targetId}`;
                    if (!relKeySet.has(relKey)) {
                        relKeySet.add(relKey);
                        relationships.push(new Relationship({
                            sourceId: src.id,
                            targetId,
                            relationType: rule.relationType,
                            weight: rule.weight ?? 1.0,
                            bidirectional: rule.bidirectional ?? false,
                            metadata: {
                                sourceSystem: 'RelationshipExtractor.rule',
                                confidenceScore: 0.95,
                            },
                        }));
                    }
                }
            }
        }
        // 2. Heuristic automatic foreign key detection for unmapped entities
        for (const entity of entities) {
            for (const [propKey, propVal] of Object.entries(entity.properties)) {
                if (typeof propVal !== 'string' && typeof propVal !== 'number')
                    continue;
                const strVal = String(propVal);
                if (propKey.endsWith('Id') || propKey.endsWith('_id') || propKey.endsWith('Ref')) {
                    if (entityMap.has(strVal) && strVal !== entity.id) {
                        let relationType = propKey.replace(/(Id|_id|Ref)$/, '').toUpperCase();
                        if (!relationType || relationType === 'PARENT')
                            relationType = 'DEPENDS_ON';
                        else
                            relationType = `RELATES_TO_${relationType}`;
                        const relKey = `${entity.id}->${relationType}->${strVal}`;
                        if (!relKeySet.has(relKey)) {
                            relKeySet.add(relKey);
                            relationships.push(new Relationship({
                                sourceId: entity.id,
                                targetId: strVal,
                                relationType,
                                weight: 1.0,
                                metadata: {
                                    sourceSystem: 'RelationshipExtractor.heuristic',
                                    confidenceScore: 0.8,
                                },
                            }));
                        }
                    }
                }
            }
        }
        return relationships;
    }
    /**
     * Infers network/call relationships from log interaction pairs.
     */
    extractFromInteractions(interactions) {
        const relationships = [];
        for (const item of interactions) {
            const rel = new Relationship({
                sourceId: item.callerId,
                targetId: item.calleeId,
                relationType: 'CALLS',
                weight: item.callCount ?? 1.0,
                attributes: {
                    avgLatencyMs: (item.avgLatencyMs ?? 0),
                    callCount: (item.callCount ?? 1),
                },
                metadata: {
                    sourceSystem: 'InteractionLog',
                    confidenceScore: 0.99,
                },
            });
            relationships.push(rel);
        }
        return relationships;
    }
}
//# sourceMappingURL=RelationshipExtractor.js.map