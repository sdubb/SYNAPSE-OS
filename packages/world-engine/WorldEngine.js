/**
 * @file WorldEngine.ts
 * @description Master orchestrator managing multi-tenant environment models, graph representations, multi-source ingestion, query engines, and lifecycle state.
 */
import { WorldModel } from './model/WorldModel.js';
import { GraphBuilder } from './graph/GraphBuilder.js';
import { GraphQuery } from './graph/GraphQuery.js';
import { GraphProjection } from './graph/GraphProjection.js';
import { DataIngestion } from './ingestion/DataIngestion.js';
export class WorldEngine {
    _models = new Map(); // modelId -> WorldModel
    _graphs = new Map(); // modelId -> GraphBuilder
    _ingestion;
    _config;
    _eventListeners = [];
    constructor(config = {}) {
        this._config = {
            defaultTenantId: config.defaultTenantId ?? 'default-tenant',
            enableValidationOnMutation: config.enableValidationOnMutation ?? false,
        };
        this._ingestion = new DataIngestion();
    }
    get ingestion() {
        return this._ingestion;
    }
    /**
     * Creates or registers a new WorldModel.
     */
    createModel(config) {
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
    getModel(modelId) {
        return this._models.get(modelId);
    }
    getAllModels() {
        return Array.from(this._models.values());
    }
    getModelsForTenant(tenantId) {
        const results = [];
        for (const m of this._models.values()) {
            if (m.tenantId === tenantId) {
                results.push(m);
            }
        }
        return results;
    }
    deleteModel(modelId) {
        this._graphs.delete(modelId);
        return this._models.delete(modelId);
    }
    getGraph(modelId) {
        return this._graphs.get(modelId);
    }
    getQuery(modelId) {
        const graph = this._graphs.get(modelId);
        return graph ? new GraphQuery(graph) : undefined;
    }
    getProjection(modelId) {
        const graph = this._graphs.get(modelId);
        return graph ? new GraphProjection(graph) : undefined;
    }
    /**
     * Updates an entity within a world model and refreshes the graph.
     */
    updateEntity(modelId, entity) {
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
    removeEntity(modelId, entityId) {
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
    updateRelationship(modelId, relationship) {
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
    removeRelationship(modelId, relationshipId) {
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
    addConstraint(modelId, constraint) {
        const model = this.requireModel(modelId);
        const updated = model.withConstraint(constraint);
        this._models.set(modelId, updated);
        return updated;
    }
    /**
     * Registers a reactive behavior on the model.
     */
    addBehavior(modelId, behavior) {
        const model = this.requireModel(modelId);
        const updated = model.withBehavior(behavior);
        this._models.set(modelId, updated);
        return updated;
    }
    /**
     * Dispatches a world event to the specified model, triggering matching behaviors and updating states.
     */
    async dispatchEvent(modelId, event) {
        let currentModel = this.requireModel(modelId);
        const results = [];
        // Notify global event listeners
        for (const listener of this._eventListeners) {
            try {
                listener(event, currentModel);
            }
            catch (err) {
                console.error('Error in world event listener:', err);
            }
        }
        // Identify target entities
        let targetEntities = [];
        if (event.entityId) {
            const entity = currentModel.getEntity(event.entityId);
            if (entity)
                targetEntities.push(entity);
        }
        else {
            targetEntities = currentModel.getAllEntities();
        }
        const emittedEvents = [];
        const context = {
            currentTimestamp: event.timestamp,
            getEntity: (id) => currentModel.getEntity(id),
            getRelatedEntities: (entityId, relType) => {
                const outRels = currentModel.getOutboundRelationships(entityId, relType);
                return outRels
                    .map((r) => currentModel.getEntity(r.targetId))
                    .filter((e) => e !== undefined);
            },
            emitEvent: (e) => {
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
    onEvent(listener) {
        this._eventListeners.push(listener);
        return this;
    }
    /**
     * Validates all constraints on a model.
     */
    validateModel(modelId) {
        const model = this.requireModel(modelId);
        return model.validate();
    }
    /**
     * Sets or synchronizes a model in full.
     */
    setModel(model) {
        this._models.set(model.id, model);
        const graph = new GraphBuilder(model);
        this._graphs.set(model.id, graph);
    }
    requireModel(modelId) {
        const model = this._models.get(modelId);
        if (!model) {
            throw new Error(`WorldModel with id '${modelId}' not found.`);
        }
        return model;
    }
}
//# sourceMappingURL=WorldEngine.js.map