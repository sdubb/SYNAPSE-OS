/**
 * @file DatabaseImporter.ts
 * @description Ingests relational database schema metadata, table rows, primary keys, and foreign keys into graph entities and relationships.
 */

import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
import type { PropertyValue } from '../model/State.js';

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

export class DatabaseImporter {
  /**
   * Imports schema metadata (creating Schema/Table entities) and row records (creating Row entities + FK edges).
   */
  public static importDatabaseSchema(
    snapshot: DatabaseSchemaSnapshot,
    options: {
      importSchemaAsEntities?: boolean;
      importRows?: boolean;
      tenantId?: string;
    } = {}
  ): DatabaseImportResult {
    const importSchema = options.importSchemaAsEntities ?? true;
    const importRows = options.importRows ?? true;

    const entities: Entity[] = [];
    const relationships: Relationship[] = [];
    let totalRows = 0;

    // Database Entity
    if (importSchema) {
      const dbEntity = new Entity({
        id: `db:${snapshot.databaseName}`,
        type: 'Database',
        name: snapshot.databaseName,
        state: {
          engine: snapshot.engine,
          tableCount: snapshot.tables.length,
        },
        metadata: {
          tenantId: options.tenantId,
          sourceSystem: 'DatabaseImporter.schema',
          tags: ['database', snapshot.engine],
        },
      });
      entities.push(dbEntity);
    }

    for (const table of snapshot.tables) {
      const tableEntityId = `table:${snapshot.databaseName}.${table.tableName}`;

      if (importSchema) {
        // Table entity
        const tableEntity = new Entity({
          id: tableEntityId,
          type: 'DatabaseTable',
          name: table.tableName,
          state: {
            tableName: table.tableName,
            schemaName: table.schemaName ?? 'public',
            columnCount: table.columns.length,
            pkColumns: table.columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
            columns: table.columns as unknown as PropertyValue,
          },
          metadata: {
            tenantId: options.tenantId,
            sourceSystem: 'DatabaseImporter.schema',
            tags: ['table', 'relational-schema'],
          },
        });
        entities.push(tableEntity);

        // Link table to DB
        relationships.push(
          new Relationship({
            sourceId: `db:${snapshot.databaseName}`,
            targetId: tableEntityId,
            relationType: 'CONTAINS_TABLE',
          })
        );
      }

      // Import rows if provided
      if (importRows && table.rows && table.rows.length > 0) {
        const pkCol = table.columns.find((c) => c.isPrimaryKey)?.name ?? 'id';
        const entityType = this.capitalize(table.tableName.replace(/s$/, ''));

        for (const row of table.rows) {
          totalRows++;
          const pkVal = row[pkCol] !== undefined ? String(row[pkCol]) : `row_${table.tableName}_${totalRows}`;
          const rowEntityId = `${table.tableName}:${pkVal}`;

          const rowEntity = new Entity({
            id: rowEntityId,
            type: entityType,
            name: `${entityType} #${pkVal}`,
            state: row as Record<string, PropertyValue>,
            metadata: {
              tenantId: options.tenantId,
              sourceSystem: 'DatabaseImporter.data',
              tags: ['db-row', table.tableName],
            },
          });
          entities.push(rowEntity);

          // Foreign key edges between row entities
          for (const fk of table.foreignKeys) {
            const fkVal = row[fk.fromColumn];
            if (fkVal !== null && fkVal !== undefined) {
              const targetRowEntityId = `${fk.toTable}:${String(fkVal)}`;
              relationships.push(
                new Relationship({
                  sourceId: rowEntityId,
                  targetId: targetRowEntityId,
                  relationType: `REFERENCES_${fk.toTable.toUpperCase()}`,
                  attributes: {
                    foreignKey: fk.fromColumn as PropertyValue,
                    referencedColumn: fk.toColumn as PropertyValue,
                  },
                  metadata: { sourceSystem: 'DatabaseImporter.fk' },
                })
              );
            }
          }
        }
      }
    }

    return {
      entities,
      relationships,
      tablesImported: snapshot.tables.length,
      rowsImported: totalRows,
    };
  }

  private static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
