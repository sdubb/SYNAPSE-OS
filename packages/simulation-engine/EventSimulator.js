/**
 * @file EventSimulator.ts
 * @description Generates and routes simulated events through the entity graph with causal delay propagation and dependency cascading.
 */
export class EventSimulator {
    _clock;
    _traces = [];
    constructor(clock) {
        this._clock = clock;
    }
    get traces() {
        return this._traces;
    }
    /**
     * Dispatches an event through the model, scheduling cascaded child events according to network delays.
     */
    async routeEvent(model, event, options = {}) {
        let currentModel = model;
        const propagationDelay = options.propagationDelayMs ?? 50;
        const maxDepth = options.maxCascadeDepth ?? 5;
        const generatedEvents = [];
        const mutatedEntityIds = [];
        const emittedQueue = [{ event, depth: 0 }];
        while (emittedQueue.length > 0) {
            const { event: currentEvt, depth } = emittedQueue.shift();
            if (depth >= maxDepth)
                continue;
            const targetEntities = currentEvt.entityId
                ? [currentModel.getEntity(currentEvt.entityId)].filter((e) => e !== undefined)
                : currentModel.getAllEntities();
            const nextLevelEmissions = [];
            const context = {
                currentTimestamp: this._clock.currentTime,
                getEntity: (id) => currentModel.getEntity(id),
                getRelatedEntities: (entityId, relType) => {
                    const outRels = currentModel.getOutboundRelationships(entityId, relType);
                    return outRels
                        .map((r) => currentModel.getEntity(r.targetId))
                        .filter((e) => e !== undefined);
                },
                emitEvent: (childEvent) => {
                    nextLevelEmissions.push(childEvent);
                    generatedEvents.push(childEvent);
                },
            };
            for (const entity of targetEntities) {
                const behaviors = currentModel.getBehaviorsForEntityAndEvent(entity.type, currentEvt.type);
                for (const behavior of behaviors) {
                    const result = await behavior.execute(currentEvt, entity, context);
                    if (result.handled && result.stateUpdates) {
                        mutatedEntityIds.push(entity.id);
                        const updated = entity.cloneWithState(result.stateUpdates, {
                            sourceSystem: `EventSimulator:${behavior.name}`,
                            updatedAt: this._clock.currentTime,
                        });
                        currentModel = currentModel.withEntity(updated);
                    }
                    if (result.emittedEvents) {
                        nextLevelEmissions.push(...result.emittedEvents);
                        generatedEvents.push(...result.emittedEvents);
                    }
                }
            }
            this._traces.push({
                eventId: currentEvt.id,
                eventType: currentEvt.type,
                originEntityId: currentEvt.source,
                targetEntityId: currentEvt.entityId,
                dispatchedAt: this._clock.currentTime,
                resultingEvents: nextLevelEmissions.map((e) => e.id),
                stateMutations: mutatedEntityIds,
            });
            // Schedule downstream cascading events on the clock
            for (const childEvt of nextLevelEmissions) {
                if (propagationDelay > 0) {
                    this._clock.schedule(this._clock.currentTime + propagationDelay, async () => {
                        emittedQueue.push({ event: childEvt, depth: depth + 1 });
                    }, childEvt);
                }
                else {
                    emittedQueue.push({ event: childEvt, depth: depth + 1 });
                }
            }
        }
        return {
            updatedModel: currentModel,
            generatedEvents,
        };
    }
    clearTraces() {
        this._traces.length = 0;
    }
}
//# sourceMappingURL=EventSimulator.js.map