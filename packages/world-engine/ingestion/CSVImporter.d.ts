/**
 * @file CSVImporter.ts
 * @description Ingests tabular CSV/TSV data, handles RFC 4180 parsing, quotes, delimiters, schema inference, type coercion, and entity conversion.
 */
import { Entity } from '../model/Entity.js';
import { type InferredType } from '../extraction/SchemaInference.js';
export interface CSVImportOptions {
    readonly delimiter?: string;
    readonly hasHeader?: boolean;
    readonly customHeaders?: readonly string[];
    readonly entityType: string;
    readonly idColumn?: string;
    readonly nameColumn?: string;
    readonly tenantId?: string;
    readonly tags?: readonly string[];
    readonly columnTypeOverrides?: Record<string, InferredType>;
}
export interface CSVImportResult {
    readonly entities: Entity[];
    readonly rowsProcessed: number;
    readonly columns: string[];
    readonly parseErrors: Array<{
        line: number;
        error: string;
    }>;
}
export declare class CSVImporter {
    /**
     * Imports CSV text and converts rows into Entities.
     */
    static importString(csvText: string, options: CSVImportOptions): CSVImportResult;
    private static parseCSVToRows;
    private static autoCastValue;
}
//# sourceMappingURL=CSVImporter.d.ts.map