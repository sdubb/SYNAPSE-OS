/**
 * @file APIImporter.ts
 * @description Polls and fetches external REST/GraphQL endpoints for state synchronization, supporting headers, pagination, error retries, and data mapping.
 */
import { Entity } from '../model/Entity.js';
export interface APIEndpointConfig {
    readonly url: string;
    readonly method?: 'GET' | 'POST';
    readonly headers?: Record<string, string>;
    readonly body?: string | Record<string, unknown>;
    readonly queryParams?: Record<string, string>;
    readonly pagination?: {
        readonly type: 'page' | 'cursor' | 'offset';
        readonly pageParam: string;
        readonly pageSizeParam?: string;
        readonly pageSize?: number;
        readonly maxPages?: number;
        readonly cursorPath?: string;
    };
    readonly entityType: string;
    readonly dataPath?: string;
    readonly idField?: string;
    readonly nameField?: string;
    readonly tenantId?: string;
}
export interface APIImportResult {
    readonly entities: Entity[];
    readonly requestsMade: number;
    readonly totalRecordsFetched: number;
    readonly errors: string[];
}
export declare class APIImporter {
    /**
     * Fetches data from an external REST/GraphQL API using fetch (native in Node >=18 / Node 22).
     */
    static fetchAndImport(config: APIEndpointConfig): Promise<APIImportResult>;
    private static extractRecordsFromPath;
    private static extractValueFromPath;
}
//# sourceMappingURL=APIImporter.d.ts.map