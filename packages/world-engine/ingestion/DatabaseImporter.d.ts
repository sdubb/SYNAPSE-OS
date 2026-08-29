/**
 * @file DatabaseImporter.ts
 * @description Ingests relational database schema metadata, table rows, primary keys, and foreign keys into graph entities and relationships.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
export interface ColumnDefinition {
    readonly name: string;
    readonly dataType: string;
    readonly isNullable: boolean;
    readonly isPrimaryKey: boolean;
    readonly defaultValue?: unknown;
}
export interface ForeignKeyDefinition {
    readonly constraintName: string;
    readonly fromColumn: string;
    readonly toTable: string;
    readonly toColumn: string;
}
export interface TableSchema {
    readonly tableName: string;
    readonly schemaName?: string;
    readonly columns: readonly ColumnDefinition[];
    readonly foreignKeys: readonly ForeignKeyDefinition[];
    readonly rows?: ReadonlyArray<Record<string, unknown>>;
}
export interface DatabaseSchemaSnapshot {
    readonly databaseName: string;
    readonly engine: 'postgres' | 'mysql' | 'sqlite' | 'sqlserver' | 'oracle' | string;
    readonly tables: readonly TableSchema[];
}
export interface DatabaseImportResult {
    readonly entities: Entity[];
    readonly relationships: Relationship[];
    readonly tablesImported: number;
    readonly rowsImported: number;
}
export declare class DatabaseImporter {
    /**
     * Imports schema metadata (creating Schema/Table entities) and row records (creating Row entities + FK edges).
     */
    static importDatabaseSchema(snapshot: DatabaseSchemaSnapshot, options?: {
        importSchemaAsEntities?: boolean;
        importRows?: boolean;
        tenantId?: string;
    }): DatabaseImportResult;
    private static capitalize;
}
//# sourceMappingURL=DatabaseImporter.d.ts.map