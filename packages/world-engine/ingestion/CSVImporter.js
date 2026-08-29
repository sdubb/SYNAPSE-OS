/**
 * @file CSVImporter.ts
 * @description Ingests tabular CSV/TSV data, handles RFC 4180 parsing, quotes, delimiters, schema inference, type coercion, and entity conversion.
 */
import { Entity } from '../model/Entity.js';
import { SchemaInference } from '../extraction/SchemaInference.js';
export class CSVImporter {
    /**
     * Imports CSV text and converts rows into Entities.
     */
    static importString(csvText, options) {
        const delimiter = options.delimiter ?? ',';
        const hasHeader = options.hasHeader ?? true;
        const parseErrors = [];
        const rawRows = this.parseCSVToRows(csvText, delimiter);
        if (rawRows.length === 0) {
            return { entities: [], rowsProcessed: 0, columns: [], parseErrors };
        }
        let headers;
        let dataRows;
        if (hasHeader) {
            headers = rawRows[0].map((h) => h.trim());
            dataRows = rawRows.slice(1);
        }
        else if (options.customHeaders) {
            headers = [...options.customHeaders];
            dataRows = rawRows;
        }
        else {
            const colCount = rawRows[0].length;
            headers = Array.from({ length: colCount }, (_, i) => `column_${i + 1}`);
            dataRows = rawRows;
        }
        // Convert raw rows to records for schema inference
        const records = [];
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (row.length === 1 && row[0]?.trim() === '')
                continue; // skip blank line
            if (row.length !== headers.length) {
                parseErrors.push({
                    line: i + (hasHeader ? 2 : 1),
                    error: `Row column count (${row.length}) does not match header count (${headers.length})`,
                });
            }
            const rec = {};
            for (let c = 0; c < headers.length; c++) {
                const header = headers[c];
                const rawVal = row[c] ?? '';
                rec[header] = this.autoCastValue(rawVal, options.columnTypeOverrides?.[header]);
            }
            records.push(rec);
        }
        const inferred = SchemaInference.inferFromRecords(records, options.entityType);
        const idField = options.idColumn ?? inferred.inferredPrimaryKey ?? headers[0] ?? 'id';
        const nameField = options.nameColumn ?? (headers.includes('name') ? 'name' : idField);
        const entities = [];
        for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            const idVal = rec[idField] !== undefined ? String(rec[idField]) : `csv_${options.entityType.toLowerCase()}_${i + 1}`;
            const nameVal = rec[nameField] !== undefined ? String(rec[nameField]) : idVal;
            const entity = new Entity({
                id: idVal,
                type: options.entityType,
                name: nameVal,
                state: rec,
                metadata: {
                    tenantId: options.tenantId,
                    sourceSystem: 'CSVImporter',
                    tags: options.tags ? [...options.tags] : ['csv-import'],
                    confidenceScore: 1.0,
                },
            });
            entities.push(entity);
        }
        return {
            entities,
            rowsProcessed: dataRows.length,
            columns: headers,
            parseErrors,
        };
    }
    static parseCSVToRows(text, delimiter) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentField += '"';
                        i++; // skip escaped quote
                    }
                    else {
                        inQuotes = false;
                    }
                }
                else {
                    currentField += char;
                }
            }
            else {
                if (char === '"') {
                    inQuotes = true;
                }
                else if (char === delimiter) {
                    currentRow.push(currentField);
                    currentField = '';
                }
                else if (char === '\r') {
                    if (nextChar === '\n') {
                        i++; // skip \n
                    }
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
                else if (char === '\n') {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
                else {
                    currentField += char;
                }
            }
        }
        if (currentField.length > 0 || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        return rows;
    }
    static autoCastValue(value, explicitType) {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') {
            return null;
        }
        if (explicitType === 'number' || explicitType === 'integer') {
            const num = Number(trimmed);
            return isNaN(num) ? trimmed : num;
        }
        if (explicitType === 'boolean') {
            return trimmed.toLowerCase() === 'true' || trimmed === '1';
        }
        // Auto-detection
        if (trimmed.toLowerCase() === 'true')
            return true;
        if (trimmed.toLowerCase() === 'false')
            return false;
        if (!isNaN(Number(trimmed)) && !trimmed.startsWith('0') && trimmed !== '') {
            return Number(trimmed);
        }
        return trimmed;
    }
}
//# sourceMappingURL=CSVImporter.js.map