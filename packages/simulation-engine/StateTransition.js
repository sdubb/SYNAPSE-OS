/**
 * @file StateTransition.ts
 * @description Computes and tracks state transitions, entity behavior evaluations, and property update chains during simulation steps.
 */
export class StateTransitionEngine {
    _history = [];
    get history() {
        return this._history;
    }
    /**
     * Applies state updates to an entity, generating a transition record.
     */
    applyTransition(entity, stateUpdates, virtualTimestamp, reason, triggerEvent) {
        const previousState = { ...entity.properties };
        const propertyDiff = {};
        for (const [key, nextVal] of Object.entries(stateUpdates)) {
            const prevVal = previousState[key];
            if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
                propertyDiff[key] = { from: prevVal, to: nextVal };
            }
        }
        const updatedEntity = entity.cloneWithState(stateUpdates, {
            updatedAt: virtualTimestamp,
            sourceSystem: `Simulation:${reason}`,
        });
        const record = {
            transitionId: `trn_${entity.id}_${virtualTimestamp}_${Math.random().toString(36).substring(2, 6)}`,
            entityId: entity.id,
            triggerEventId: triggerEvent?.id,
            virtualTimestamp,
            previousState,
            nextState: { ...updatedEntity.properties },
            propertyDiff,
            reason,
        };
        this._history.push(record);
        return {
            updatedEntity,
            record,
        };
    }
    getTransitionsForEntity(entityId) {
        return this._history.filter((h) => h.entityId === entityId);
    }
    clearHistory() {
        this._history.length = 0;
    }
}
//# sourceMappingURL=StateTransition.js.map