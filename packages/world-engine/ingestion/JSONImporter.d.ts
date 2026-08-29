/**
 * @file JSONImporter.ts
 * @description Ingests JSON and JSONL datasets, extracts parent/child entity hierarchies, property bags, and relationship linkages.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
export interface JSONImportOptions {
    readonly rootEntityType?: string;
    readonly idField?: string;
    readonly nameField?: string;
    readonly tenantId?: string;
    readonly extractNestedEntities?: boolean;
    readonly nestedEntityTypes?: Record<string, string>;
}
export interface JSONImportResult {
    readonly entities: Entity[];
    readonly relationships: Relationship[];
    readonly documentsProcessed: number;
    readonly parseErrors: Array<{
        index: number;
        error: string;
    }>;
}
export declare class JSONImporter {
    /**
     * Ingests a JSON string (single object, array of objects, or JSONL lines).
     */
    static importString(jsonText: string, options?: JSONImportOptions): JSONImportResult;
}
//# sourceMappingURL=JSONImporter.d.ts.map