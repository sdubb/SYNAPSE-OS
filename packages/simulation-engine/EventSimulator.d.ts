/**
 * @file EventSimulator.ts
 * @description Generates and routes simulated events through the entity graph with causal delay propagation and dependency cascading.
 */
import { WorldEvent, WorldModel } from '@synapse/world-engine';
import { SimulationClock } from './SimulationClock.js';
export interface EventRouteTrace {
    readonly eventId: string;
    readonly eventType: string;
    readonly originEntityId?: string;
    readonly targetEntityId?: string;
    readonly dispatchedAt: number;
    readonly resultingEvents: readonly string[];
    readonly stateMutations: readonly string[];
}
export declare class EventSimulator {
    private readonly _clock;
    private readonly _traces;
    constructor(clock: SimulationClock);
    get traces(): readonly EventRouteTrace[];
    /**
     * Dispatches an event through the model, scheduling cascaded child events according to network delays.
     */
    routeEvent(model: WorldModel, event: WorldEvent, options?: {
        propagationDelayMs?: number;
        maxCascadeDepth?: number;
    }): Promise<{
        updatedModel: WorldModel;
        generatedEvents: WorldEvent[];
    }>;
    clearTraces(): void;
}
//# sourceMappingURL=EventSimulator.d.ts.map