/**
 * @file WorldEngine.ts
 * @description Master orchestrator managing multi-tenant environment models, graph representations, multi-source ingestion, query engines, and lifecycle state.
 */
import { WorldModel, type WorldModelConfig, type WorldModelValidationResult } from './model/WorldModel.js';
import { Entity } from './model/Entity.js';
import { Relationship } from './model/Relationship.js';
import { Constraint } from './model/Constraint.js';
import { Behavior, type BehaviorResult } from './model/Behavior.js';
import { WorldEvent } from './model/Event.js';
import { GraphBuilder } from './graph/GraphBuilder.js';
import { GraphQuery } from './graph/GraphQuery.js';
import { GraphProjection } from './graph/GraphProjection.js';
import { DataIngestion } from './ingestion/DataIngestion.js';
export interface WorldEngineConfig {
    readonly defaultTenantId?: string;
    readonly enableValidationOnMutation?: boolean;
}
export declare class WorldEngine {
    private readonly _models;
    private readonly _graphs;
    private readonly _ingestion;
    private readonly _config;
    private readonly _eventListeners;
    constructor(config?: WorldEngineConfig);
    get ingestion(): DataIngestion;
    /**
     * Creates or registers a new WorldModel.
     */
    createModel(config: WorldModelConfig): WorldModel;
    getModel(modelId: string): WorldModel | undefined;
    getAllModels(): WorldModel[];
    getModelsForTenant(tenantId: string): WorldModel[];
    deleteModel(modelId: string): boolean;
    getGraph(modelId: string): GraphBuilder | undefined;
    getQuery(modelId: string): GraphQuery | undefined;
    getProjection(modelId: string): GraphProjection | undefined;
    /**
     * Updates an entity within a world model and refreshes the graph.
     */
    updateEntity(modelId: string, entity: Entity): WorldModel;
    /**
     * Removes an entity from a world model.
     */
    removeEntity(modelId: string, entityId: string): WorldModel;
    /**
     * Adds or updates a relationship in the world model and graph.
     */
    updateRelationship(modelId: string, relationship: Relationship): WorldModel;
    /**
     * Removes a relationship from the world model.
     */
    removeRelationship(modelId: string, relationshipId: string): WorldModel;
    /**
     * Registers a constraint invariant on the model.
     */
    addConstraint(modelId: string, constraint: Constraint): WorldModel;
    /**
     * Registers a reactive behavior on the model.
     */
    addBehavior(modelId: string, behavior: Behavior): WorldModel;
    /**
     * Dispatches a world event to the specified model, triggering matching behaviors and updating states.
     */
    dispatchEvent(modelId: string, event: WorldEvent): Promise<BehaviorResult[]>;
    /**
     * Subscribes to events across all models.
     */
    onEvent(listener: (event: WorldEvent, model: WorldModel) => void): this;
    /**
     * Validates all constraints on a model.
     */
    validateModel(modelId: string): WorldModelValidationResult;
    /**
     * Sets or synchronizes a model in full.
     */
    setModel(model: WorldModel): void;
    private requireModel;
}
//# sourceMappingURL=WorldEngine.d.ts.map