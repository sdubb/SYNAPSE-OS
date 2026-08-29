/**
 * @file DataIngestion.ts
 * @description Master pipeline coordinator for multi-source data ingestion into the World Model and Graph.
 */

import { WorldModel } from '../model/WorldModel.js';
import { CSVImporter, type CSVImportOptions } from './CSVImporter.js';
import { JSONImporter, type JSONImportOptions } from './JSONImporter.js';
import { DatabaseImporter, type DatabaseSchemaSnapshot } from './DatabaseImporter.js';
import { APIImporter, type APIEndpointConfig } from './APIImporter.js';
import { LogImporter, type LogFormat } from './LogImporter.js';
import { EventStreamImporter, type StreamConsumerConfig } from './EventStreamImporter.js';
import { EntityExtractor } from '../extraction/EntityExtractor.js';
import { RelationshipExtractor } from '../extraction/RelationshipExtractor.js';
import { DependencyExtractor } from '../extraction/DependencyExtractor.js';
import type { WorldEvent } from '../model/Event.js';

export interface IngestionJobResult {
  readonly jobId: string;
  readonly sourceType: 'csv' | 'json' | 'database' | 'api' | 'log' | 'stream';
  readonly entitiesAdded: number;
  readonly relationshipsAdded: number;
  readonly eventsProcessed: number;
  readonly errors: string[];
  readonly durationMs: number;
}

export class DataIngestion {
  private readonly _entityExtractor: EntityExtractor;
  private readonly _relationshipExtractor: RelationshipExtractor;
  private readonly _dependencyExtractor: DependencyExtractor;
  private readonly _activeStreams: Map<string, EventStreamImporter> = new Map();

  constructor() {
    this._entityExtractor = new EntityExtractor();
    this._relationshipExtractor = new RelationshipExtractor();
    this._dependencyExtractor = new DependencyExtractor();
  }

  public get entityExtractor(): EntityExtractor {
    return this._entityExtractor;
  }

  public get relationshipExtractor(): RelationshipExtractor {
    return this._relationshipExtractor;
  }

  public get dependencyExtractor(): DependencyExtractor {
    return this._dependencyExtractor;
  }

  /**
   * Ingests CSV data and adds extracted entities and discovered relationships into the WorldModel.
   */
  public ingestCSV(
    worldModel: WorldModel,
    csvContent: string,
    options: CSVImportOptions
  ): { updatedModel: WorldModel; result: IngestionJobResult } {
    const startTime = Date.now();
    const importResult = CSVImporter.importString(csvContent, options);

    const rels = this._relationshipExtractor.extractRelationships(importResult.entities);

    let updated = worldModel.withEntities(importResult.entities);
    if (rels.length > 0) {
      updated = updated.withRelationships(rels);
    }

    return {
      updatedModel: updated,
      result: {
        jobId: `job_csv_${Date.now()}`,
        sourceType: 'csv',
        entitiesAdded: importResult.entities.length,
        relationshipsAdded: rels.length,
        eventsProcessed: 0,
        errors: importResult.parseErrors.map((e) => `Line ${e.line}: ${e.error}`),
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Ingests JSON / JSONL data and integrates into WorldModel.
   */
  public ingestJSON(
    worldModel: WorldModel,
    jsonContent: string,
    options: JSONImportOptions = {}
  ): { updatedModel: WorldModel; result: IngestionJobResult } {
    const startTime = Date.now();
    const importResult = JSONImporter.importString(jsonContent, options);

    const discoveredRels = this._relationshipExtractor.extractRelationships(importResult.entities);
    const allRels = [...importResult.relationships, ...discoveredRels];

    let updated = worldModel.withEntities(importResult.entities);
    if (allRels.length > 0) {
      updated = updated.withRelationships(allRels);
    }

    return {
      updatedModel: updated,
      result: {
        jobId: `job_json_${Date.now()}`,
        sourceType: 'json',
        entitiesAdded: importResult.entities.length,
        relationshipsAdded: allRels.length,
        eventsProcessed: 0,
        errors: importResult.parseErrors.map((e) => `Index ${e.index}: ${e.error}`),
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Ingests Database metadata schema and rows into WorldModel.
   */
  public ingestDatabase(
    worldModel: WorldModel,
    snapshot: DatabaseSchemaSnapshot,
    options?: { importSchemaAsEntities?: boolean; importRows?: boolean }
  ): { updatedModel: WorldModel; result: IngestionJobResult } {
    const startTime = Date.now();
    const importResult = DatabaseImporter.importDatabaseSchema(snapshot, {
      ...options,
      tenantId: worldModel.tenantId,
    });

    let updated = worldModel.withEntities(importResult.entities);
    if (importResult.relationships.length > 0) {
      updated = updated.withRelationships(importResult.relationships);
    }

    return {
      updatedModel: updated,
      result: {
        jobId: `job_db_${Date.now()}`,
        sourceType: 'database',
        entitiesAdded: importResult.entities.length,
        relationshipsAdded: importResult.relationships.length,
        eventsProcessed: 0,
        errors: [],
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Ingests API data by polling/fetching external endpoints.
   */
  public async ingestAPI(
    worldModel: WorldModel,
    config: APIEndpointConfig
  ): Promise<{ updatedModel: WorldModel; result: IngestionJobResult }> {
    const startTime = Date.now();
    const importResult = await APIImporter.fetchAndImport({
      ...config,
      tenantId: config.tenantId ?? worldModel.tenantId,
    });

    const rels = this._relationshipExtractor.extractRelationships(importResult.entities);

    let updated = worldModel.withEntities(importResult.entities);
    if (rels.length > 0) {
      updated = updated.withRelationships(rels);
    }

    return {
      updatedModel: updated,
      result: {
        jobId: `job_api_${Date.now()}`,
        sourceType: 'api',
        entitiesAdded: importResult.entities.length,
        relationshipsAdded: rels.length,
        eventsProcessed: 0,
        errors: importResult.errors,
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Ingests log streams and extracts state update events and telemetry.
   */
  public ingestLogs(
    logContent: string,
    format: LogFormat = 'auto'
  ): { events: WorldEvent[]; result: IngestionJobResult } {
    const startTime = Date.now();
    const parsed = LogImporter.parseLogStream(logContent, format);
    const events = LogImporter.logsToWorldEvents(parsed);

    return {
      events,
      result: {
        jobId: `job_log_${Date.now()}`,
        sourceType: 'log',
        entitiesAdded: 0,
        relationshipsAdded: 0,
        eventsProcessed: events.length,
        errors: [],
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Registers and activates an event stream consumer.
   */
  public createEventStream(
    config: StreamConsumerConfig,
    onBatchReceived: (events: readonly WorldEvent[]) => Promise<void> | void
  ): EventStreamImporter {
    const stream = new EventStreamImporter(config);
    stream.onBatch(onBatchReceived);
    this._activeStreams.set(config.streamId, stream);
    return stream;
  }

  public getEventStream(streamId: string): EventStreamImporter | undefined {
    return this._activeStreams.get(streamId);
  }

  public closeAllStreams(): void {
    for (const stream of this._activeStreams.values()) {
      stream.destroy();
    }
    this._activeStreams.clear();
  }
}
