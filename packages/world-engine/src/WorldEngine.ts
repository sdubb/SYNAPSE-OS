/**
 * @file WorldEngine.ts
 * @description Master orchestrator managing multi-tenant environment models, graph representations, multi-source ingestion, query engines, and lifecycle state.
 */

import { WorldModel, type WorldModelConfig, type WorldModelValidationResult } from './model/WorldModel.js';
import { Entity } from './model/Entity.js';
import { Relationship } from './model/Relationship.js';
import { Constraint } from './model/Constraint.js';
import { Behavior, type BehaviorExecutionContext, type BehaviorResult } from './model/Behavior.js';
import { WorldEvent } from './model/Event.js';
import { GraphBuilder } from './graph/GraphBuilder.js';
import { GraphQuery } from './graph/GraphQuery.js';
import { GraphProjection } from './graph/GraphProjection.js';
import { DataIngestion } from './ingestion/DataIngestion.js';

export interface WorldEngineConfig {
  readonly defaultTenantId?: string;
  readonly enableValidationOnMutation?: boolean;
}

export class WorldEngine {
  private readonly _models: Map<string, WorldModel> = new Map(); // modelId -> WorldModel
  private readonly _graphs: Map<string, GraphBuilder> = new Map(); // modelId -> GraphBuilder
  private readonly _ingestion: DataIngestion;
  private readonly _config: Required<WorldEngineConfig>;
  private readonly _eventListeners: Array<(event: WorldEvent, model: WorldModel) => void> = [];

  constructor(config: WorldEngineConfig = {}) {
    this._config = {
      defaultTenantId: config.defaultTenantId ?? 'default-tenant',
      enableValidationOnMutation: config.enableValidationOnMutation ?? false,
    };
    this._ingestion = new DataIngestion();
  }

  public get ingestion(): DataIngestion {
    return this._ingestion;
  }

  /**
   * Creates or registers a new WorldModel.
   */
  public createModel(config: WorldModelConfig): WorldModel {
    if (this._models.has(config.id)) {
      throw new Error(`WorldModel with id '${config.id}' already exists.`);
    }

    const model = new WorldModel({
      ...config,
      tenantId: config.tenantId ?? this._config.defaultTenantId,
    });

    this._models.set(model.id, model);

    const graph = new GraphBuilder(model);
    this._graphs.set(model.id, graph);

    return model;
  }

  public getModel(modelId: string): WorldModel | undefined {
    return this._models.get(modelId);
  }

  public getAllModels(): WorldModel[] {
    return Array.from(this._models.values());
  }

  public getModelsForTenant(tenantId: string): WorldModel[] {
    const results: WorldModel[] = [];
    for (const m of this._models.values()) {
      if (m.tenantId === tenantId) {
        results.push(m);
      }
    }
    return results;
  }

  public deleteModel(modelId: string): boolean {
    this._graphs.delete(modelId);
    return this._models.delete(modelId);
  }

  public getGraph(modelId: string): GraphBuilder | undefined {
    return this._graphs.get(modelId);
  }

  public getQuery(modelId: string): GraphQuery | undefined {
    const graph = this._graphs.get(modelId);
    return graph ? new GraphQuery(graph) : undefined;
  }

  public getProjection(modelId: string): GraphProjection | undefined {
    const graph = this._graphs.get(modelId);
    return graph ? new GraphProjection(graph) : undefined;
  }

  /**
   * Updates an entity within a world model and refreshes the graph.
   */
  public updateEntity(modelId: string, entity: Entity): WorldModel {
    const model = this.requireModel(modelId);
    const updated = model.withEntity(entity);
    this._models.set(modelId, updated);

    const graph = this._graphs.get(modelId);
    if (graph) {
      graph.addNode(entity);
    }

    if (this._config.enableValidationOnMutation) {
      this.validateModel(modelId);
    }

    return updated;
  }

  /**
   * Removes an entity from a world model.
   */
  public removeEntity(modelId: string, entityId: string): WorldModel {
    const model = this.requireModel(modelId);
    const updated = model.withoutEntity(entityId);
    this._models.set(modelId, updated);

    const graph = this._graphs.get(modelId);
    if (graph) {
      graph.removeNode(entityId);
    }

    return updated;
  }

  /**
   * Adds or updates a relationship in the world model and graph.
   */
  public updateRelationship(modelId: string, relationship: Relationship): WorldModel {
    const model = this.requireModel(modelId);
    const updated = model.withRelationship(relationship);
    this._models.set(modelId, updated);

    const graph = this._graphs.get(modelId);
    if (graph) {
      graph.addEdge(relationship);
    }

    return updated;
  }

  /**
   * Removes a relationship from the world model.
   */
  public removeRelationship(modelId: string, relationshipId: string): WorldModel {
    const model = this.requireModel(modelId);
    const updated = model.withoutRelationship(relationshipId);
    this._models.set(modelId, updated);

    const graph = this._graphs.get(modelId);
    if (graph) {
      graph.removeEdge(relationshipId);
    }

    return updated;
  }

  /**
   * Registers a constraint invariant on the model.
   */
  public addConstraint(modelId: string, constraint: Constraint): WorldModel {
    const model = this.requireModel(modelId);
    const updated = model.withConstraint(constraint);
    this._models.set(modelId, updated);
    return updated;
  }

  /**
   * Registers a reactive behavior on the model.
   */
  public addBehavior(modelId: string, behavior: Behavior): WorldModel {
    const model = this.requireModel(modelId);
    const updated = model.withBehavior(behavior);
    this._models.set(modelId, updated);
    return updated;
  }

  /**
   * Dispatches a world event to the specified model, triggering matching behaviors and updating states.
   */
  public async dispatchEvent(modelId: string, event: WorldEvent): Promise<BehaviorResult[]> {
    let currentModel = this.requireModel(modelId);
    const results: BehaviorResult[] = [];

    // Notify global event listeners
    for (const listener of this._eventListeners) {
      try {
        listener(event, currentModel);
      } catch (err) {
        console.error('Error in world event listener:', err);
      }
    }

    // Identify target entities
    let targetEntities: Entity[] = [];
    if (event.entityId) {
      const entity = currentModel.getEntity(event.entityId);
      if (entity) targetEntities.push(entity);
    } else {
      targetEntities = currentModel.getAllEntities();
    }

    const emittedEvents: WorldEvent[] = [];

    const context: BehaviorExecutionContext = {
      currentTimestamp: event.timestamp,
      getEntity: (id: string) => currentModel.getEntity(id),
      getRelatedEntities: (entityId: string, relType?: string) => {
        const outRels = currentModel.getOutboundRelationships(entityId, relType);
        return outRels
          .map((r) => currentModel.getEntity(r.targetId))
          .filter((e): e is Entity => e !== undefined);
      },
      emitEvent: (e: WorldEvent) => {
        emittedEvents.push(e);
      },
    };

    for (const entity of targetEntities) {
      const behaviors = currentModel.getBehaviorsForEntityAndEvent(entity.type, event.type);

      for (const behavior of behaviors) {
        const result = await behavior.execute(event, entity, context);
        if (result.handled) {
          results.push(result);

          if (result.stateUpdates) {
            const updatedEntity = entity.cloneWithState(result.stateUpdates, {
              sourceSystem: `Behavior:${behavior.name}`,
            });
            currentModel = this.updateEntity(modelId, updatedEntity);
          }

          if (result.emittedEvents) {
            emittedEvents.push(...result.emittedEvents);
          }
        }
      }
    }

    // Recursively dispatch secondary emitted events
    for (const childEvent of emittedEvents) {
      const childResults = await this.dispatchEvent(modelId, childEvent);
      results.push(...childResults);
    }

    return results;
  }

  /**
   * Subscribes to events across all models.
   */
  public onEvent(listener: (event: WorldEvent, model: WorldModel) => void): this {
    this._eventListeners.push(listener);
    return this;
  }

  /**
   * Validates all constraints on a model.
   */
  public validateModel(modelId: string): WorldModelValidationResult {
    const model = this.requireModel(modelId);
    return model.validate();
  }

  /**
   * Sets or synchronizes a model in full.
   */
  public setModel(model: WorldModel): void {
    this._models.set(model.id, model);
    const graph = new GraphBuilder(model);
    this._graphs.set(model.id, graph);
  }

  private requireModel(modelId: string): WorldModel {
    const model = this._models.get(modelId);
    if (!model) {
      throw new Error(`WorldModel with id '${modelId}' not found.`);
    }
    return model;
  }
}
