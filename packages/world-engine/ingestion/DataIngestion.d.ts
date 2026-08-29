/**
 * @file DataIngestion.ts
 * @description Master pipeline coordinator for multi-source data ingestion into the World Model and Graph.
 */
import { WorldModel } from '../model/WorldModel.js';
import { type CSVImportOptions } from './CSVImporter.js';
import { type JSONImportOptions } from './JSONImporter.js';
import { type DatabaseSchemaSnapshot } from './DatabaseImporter.js';
import { type APIEndpointConfig } from './APIImporter.js';
import { type LogFormat } from './LogImporter.js';
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
export declare class DataIngestion {
    private readonly _entityExtractor;
    private readonly _relationshipExtractor;
    private readonly _dependencyExtractor;
    private readonly _activeStreams;
    constructor();
    get entityExtractor(): EntityExtractor;
    get relationshipExtractor(): RelationshipExtractor;
    get dependencyExtractor(): DependencyExtractor;
    /**
     * Ingests CSV data and adds extracted entities and discovered relationships into the WorldModel.
     */
    ingestCSV(worldModel: WorldModel, csvContent: string, options: CSVImportOptions): {
        updatedModel: WorldModel;
        result: IngestionJobResult;
    };
    /**
     * Ingests JSON / JSONL data and integrates into WorldModel.
     */
    ingestJSON(worldModel: WorldModel, jsonContent: string, options?: JSONImportOptions): {
        updatedModel: WorldModel;
        result: IngestionJobResult;
    };
    /**
     * Ingests Database metadata schema and rows into WorldModel.
     */
    ingestDatabase(worldModel: WorldModel, snapshot: DatabaseSchemaSnapshot, options?: {
        importSchemaAsEntities?: boolean;
        importRows?: boolean;
    }): {
        updatedModel: WorldModel;
        result: IngestionJobResult;
    };
    /**
     * Ingests API data by polling/fetching external endpoints.
     */
    ingestAPI(worldModel: WorldModel, config: APIEndpointConfig): Promise<{
        updatedModel: WorldModel;
        result: IngestionJobResult;
    }>;
    /**
     * Ingests log streams and extracts state update events and telemetry.
     */
    ingestLogs(logContent: string, format?: LogFormat): {
        events: WorldEvent[];
        result: IngestionJobResult;
    };
    /**
     * Registers and activates an event stream consumer.
     */
    createEventStream(config: StreamConsumerConfig, onBatchReceived: (events: readonly WorldEvent[]) => Promise<void> | void): EventStreamImporter;
    getEventStream(streamId: string): EventStreamImporter | undefined;
    closeAllStreams(): void;
}
//# sourceMappingURL=DataIngestion.d.ts.map