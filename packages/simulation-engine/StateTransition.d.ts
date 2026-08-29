/**
 * @file StateTransition.ts
 * @description Computes and tracks state transitions, entity behavior evaluations, and property update chains during simulation steps.
 */
import type { Entity, PropertyValue, WorldEvent } from '@synapse/world-engine';
export interface StateTransitionRecord {
    readonly transitionId: string;
    readonly entityId: string;
    readonly triggerEventId?: string;
    readonly virtualTimestamp: number;
    readonly previousState: Record<string, PropertyValue>;
    readonly nextState: Record<string, PropertyValue>;
    readonly propertyDiff: Record<string, {
        from: PropertyValue;
        to: PropertyValue;
    }>;
    readonly reason: string;
    readonly durationMs?: number;
}
export declare class StateTransitionEngine {
    private readonly _history;
    get history(): readonly StateTransitionRecord[];
    /**
     * Applies state updates to an entity, generating a transition record.
     */
    applyTransition(entity: Entity, stateUpdates: Record<string, PropertyValue>, virtualTimestamp: number, reason: string, triggerEvent?: WorldEvent): {
        updatedEntity: Entity;
        record: StateTransitionRecord;
    };
    getTransitionsForEntity(entityId: string): StateTransitionRecord[];
    clearHistory(): void;
}
//# sourceMappingURL=StateTransition.d.ts.map