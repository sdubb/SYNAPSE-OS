/**
 * @file EntityExtractor.ts
 * @description Automatically extracts domain entities from telemetry, JSON payloads, configurations, and source code.
 */
import { Entity, type EntityLifecycleStatus } from '../model/Entity.js';
export interface ExtractionRule {
    readonly entityType: string;
    readonly idPattern: string | ((data: Record<string, unknown>) => string);
    readonly namePattern?: string | ((data: Record<string, unknown>) => string);
    readonly statusPattern?: (data: Record<string, unknown>) => EntityLifecycleStatus;
    readonly attributeMapping?: Record<string, string>;
    readonly defaultTags?: readonly string[];
    readonly condition?: (data: Record<string, unknown>) => boolean;
}
export interface ExtractionResult {
    readonly entities: Entity[];
    readonly extractedCount: number;
    readonly unmappedCount: number;
    readonly errors: Array<{
        record: unknown;
        error: string;
    }>;
}
export declare class EntityExtractor {
    private readonly _rules;
    /**
     * Registers an extraction rule for a specific source category or general ingestion.
     */
    registerRule(category: string, rule: ExtractionRule): this;
    /**
     * Automatically extracts entities from an array of raw structured records.
     */
    extractFromRecords(records: Array<Record<string, unknown>>, category?: string, fallbackType?: string): ExtractionResult;
    /**
     * Extracts entities from code artifacts, AST components, or microservice manifests.
     */
    extractFromServiceManifest(manifest: {
        name: string;
        version?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        env?: Record<string, string>;
        routes?: Array<{
            path: string;
            method: string;
        }>;
    }): Entity[];
}
//# sourceMappingURL=EntityExtractor.d.ts.map