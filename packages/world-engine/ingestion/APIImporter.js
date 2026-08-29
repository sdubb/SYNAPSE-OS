/**
 * @file APIImporter.ts
 * @description Polls and fetches external REST/GraphQL endpoints for state synchronization, supporting headers, pagination, error retries, and data mapping.
 */
import { Entity } from '../model/Entity.js';
export class APIImporter {
    /**
     * Fetches data from an external REST/GraphQL API using fetch (native in Node >=18 / Node 22).
     */
    static async fetchAndImport(config) {
        const method = config.method ?? 'GET';
        const headers = { 'Content-Type': 'application/json', ...config.headers };
        const maxPages = config.pagination?.maxPages ?? 1;
        const entities = [];
        const errors = [];
        let requestsMade = 0;
        let totalRecords = 0;
        let currentPage = 1;
        let currentCursor;
        for (let page = 0; page < maxPages; page++) {
            const urlObj = new URL(config.url);
            if (config.queryParams) {
                for (const [k, v] of Object.entries(config.queryParams)) {
                    urlObj.searchParams.set(k, v);
                }
            }
            if (config.pagination) {
                if (config.pagination.type === 'page') {
                    urlObj.searchParams.set(config.pagination.pageParam, String(currentPage));
                    if (config.pagination.pageSizeParam && config.pagination.pageSize) {
                        urlObj.searchParams.set(config.pagination.pageSizeParam, String(config.pagination.pageSize));
                    }
                }
                else if (config.pagination.type === 'offset') {
                    const offset = (currentPage - 1) * (config.pagination.pageSize ?? 50);
                    urlObj.searchParams.set(config.pagination.pageParam, String(offset));
                }
                else if (config.pagination.type === 'cursor' && currentCursor) {
                    urlObj.searchParams.set(config.pagination.pageParam, currentCursor);
                }
            }
            try {
                requestsMade++;
                const response = await fetch(urlObj.toString(), {
                    method,
                    headers,
                    body: method === 'POST' && config.body ? (typeof config.body === 'string' ? config.body : JSON.stringify(config.body)) : undefined,
                });
                if (!response.ok) {
                    errors.push(`HTTP ${response.status} ${response.statusText} from ${urlObj.toString()}`);
                    break;
                }
                const json = await response.json();
                const records = this.extractRecordsFromPath(json, config.dataPath);
                if (!Array.isArray(records) || records.length === 0) {
                    break;
                }
                totalRecords += records.length;
                const idField = config.idField ?? 'id';
                const nameField = config.nameField ?? 'name';
                for (let i = 0; i < records.length; i++) {
                    const rec = records[i];
                    if (!rec || typeof rec !== 'object')
                        continue;
                    const recordObj = rec;
                    const rawId = recordObj[idField] ?? `${config.entityType.toLowerCase()}_p${page}_${i + 1}`;
                    const id = String(rawId);
                    const name = String(recordObj[nameField] ?? id);
                    const entity = new Entity({
                        id,
                        type: config.entityType,
                        name,
                        state: recordObj,
                        metadata: {
                            tenantId: config.tenantId,
                            sourceSystem: `APIImporter:${urlObj.hostname}`,
                            tags: ['api-sync', config.entityType.toLowerCase()],
                            confidenceScore: 1.0,
                        },
                    });
                    entities.push(entity);
                }
                // Advance pagination
                if (config.pagination?.type === 'cursor' && config.pagination.cursorPath) {
                    const nextCursor = this.extractValueFromPath(json, config.pagination.cursorPath);
                    if (!nextCursor || typeof nextCursor !== 'string') {
                        break;
                    }
                    currentCursor = nextCursor;
                }
                currentPage++;
            }
            catch (err) {
                errors.push(err instanceof Error ? err.message : String(err));
                break;
            }
        }
        return {
            entities,
            requestsMade,
            totalRecordsFetched: totalRecords,
            errors,
        };
    }
    static extractRecordsFromPath(data, path) {
        if (!path) {
            if (Array.isArray(data))
                return data;
            if (typeof data === 'object' && data !== null) {
                // Look for common wrapper fields: data, items, results, records
                const obj = data;
                if (Array.isArray(obj['data']))
                    return obj['data'];
                if (Array.isArray(obj['items']))
                    return obj['items'];
                if (Array.isArray(obj['results']))
                    return obj['results'];
                if (Array.isArray(obj['records']))
                    return obj['records'];
                return [data];
            }
            return [];
        }
        const segments = path.split('.');
        let current = data;
        for (const seg of segments) {
            if (current === null || current === undefined || typeof current !== 'object')
                return [];
            current = current[seg];
        }
        return Array.isArray(current) ? current : [];
    }
    static extractValueFromPath(data, path) {
        const segments = path.split('.');
        let current = data;
        for (const seg of segments) {
            if (current === null || current === undefined || typeof current !== 'object')
                return undefined;
            current = current[seg];
        }
        return current;
    }
}
//# sourceMappingURL=APIImporter.js.map