/**
 * @file JSONImporter.ts
 * @description Ingests JSON and JSONL datasets, extracts parent/child entity hierarchies, property bags, and relationship linkages.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
export class JSONImporter {
    /**
     * Ingests a JSON string (single object, array of objects, or JSONL lines).
     */
    static importString(jsonText, options = {}) {
        const trimmed = jsonText.trim();
        const parseErrors = [];
        let rawItems = [];
        // Check if JSON Lines (JSONL)
        if (trimmed.includes('\n') && !trimmed.startsWith('[') && !trimmed.startsWith('{')) {
            const lines = trimmed.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]?.trim();
                if (!line)
                    continue;
                try {
                    rawItems.push(JSON.parse(line));
                }
                catch (err) {
                    parseErrors.push({ index: i, error: err instanceof Error ? err.message : String(err) });
                }
            }
        }
        else {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    rawItems = parsed;
                }
                else if (typeof parsed === 'object' && parsed !== null) {
                    rawItems = [parsed];
                }
            }
            catch (err) {
                parseErrors.push({ index: 0, error: err instanceof Error ? err.message : String(err) });
                return { entities: [], relationships: [], documentsProcessed: 0, parseErrors };
            }
        }
        const allEntities = [];
        const allRelationships = [];
        const rootType = options.rootEntityType ?? 'Record';
        const idField = options.idField ?? 'id';
        const nameField = options.nameField ?? 'name';
        for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i];
            if (!item || typeof item !== 'object' || Array.isArray(item))
                continue;
            const record = item;
            const rawId = record[idField] ?? record['_id'] ?? `json_${rootType.toLowerCase()}_${i + 1}`;
            const entityId = String(rawId);
            const entityName = String(record[nameField] ?? record['title'] ?? record['label'] ?? entityId);
            const flatProperties = {};
            for (const [key, value] of Object.entries(record)) {
                if (options.extractNestedEntities &&
                    typeof value === 'object' &&
                    value !== null &&
                    !Array.isArray(value)) {
                    // Extract nested child entity
                    const childType = options.nestedEntityTypes?.[key] ?? `${key.charAt(0).toUpperCase() + key.slice(1)}`;
                    const childObj = value;
                    const childId = childObj['id'] ? String(childObj['id']) : `${entityId}_${key}`;
                    const childName = childObj['name'] ? String(childObj['name']) : childId;
                    const childEntity = new Entity({
                        id: childId,
                        type: childType,
                        name: childName,
                        state: childObj,
                        metadata: {
                            tenantId: options.tenantId,
                            sourceSystem: 'JSONImporter.nested',
                            tags: ['nested-entity'],
                        },
                    });
                    allEntities.push(childEntity);
                    const parentChildRel = new Relationship({
                        sourceId: entityId,
                        targetId: childId,
                        relationType: `HAS_${key.toUpperCase()}`,
                        metadata: { sourceSystem: 'JSONImporter.hierarchy' },
                    });
                    allRelationships.push(parentChildRel);
                }
                else if (options.extractNestedEntities &&
                    Array.isArray(value) &&
                    value.length > 0 &&
                    typeof value[0] === 'object' &&
                    value[0] !== null) {
                    // Extract array of child entities
                    const childType = options.nestedEntityTypes?.[key] ?? `${key.replace(/s$/, '').charAt(0).toUpperCase() + key.replace(/s$/, '').slice(1)}`;
                    for (let j = 0; j < value.length; j++) {
                        const childObj = value[j];
                        const childId = childObj['id'] ? String(childObj['id']) : `${entityId}_${key}_${j + 1}`;
                        const childName = childObj['name'] ? String(childObj['name']) : childId;
                        const childEntity = new Entity({
                            id: childId,
                            type: childType,
                            name: childName,
                            state: childObj,
                            metadata: {
                                tenantId: options.tenantId,
                                sourceSystem: 'JSONImporter.arrayNested',
                                tags: ['nested-array-item'],
                            },
                        });
                        allEntities.push(childEntity);
                        const rel = new Relationship({
                            sourceId: entityId,
                            targetId: childId,
                            relationType: `CONTAINS_${key.toUpperCase()}`,
                            metadata: { sourceSystem: 'JSONImporter.hierarchy' },
                        });
                        allRelationships.push(rel);
                    }
                }
                else {
                    flatProperties[key] = value;
                }
            }
            const rootEntity = new Entity({
                id: entityId,
                type: rootType,
                name: entityName,
                state: flatProperties,
                metadata: {
                    tenantId: options.tenantId,
                    sourceSystem: 'JSONImporter',
                    tags: ['json-import'],
                    confidenceScore: 1.0,
                },
            });
            allEntities.push(rootEntity);
        }
        return {
            entities: allEntities,
            relationships: allRelationships,
            documentsProcessed: rawItems.length,
            parseErrors,
        };
    }
}
//# sourceMappingURL=JSONImporter.js.map