/**
 * @file Event.ts
 * @description Discrete world event representing observations, environmental triggers, actions, and telemetry.
 */
import type { PropertyValue } from './State.js';
export type EventType = 'telemetry.metric' | 'telemetry.log' | 'state.changed' | 'entity.created' | 'entity.updated' | 'entity.deleted' | 'relationship.created' | 'relationship.deleted' | 'environment.mutation' | 'simulation.step' | 'agent.action' | 'system.drift_detected' | (string & {});
export interface EventEnvelope<T = Record<string, PropertyValue>> {
    readonly id: string;
    readonly type: EventType;
    readonly source: string;
    readonly timestamp: number;
    readonly tenantId?: string;
    readonly entityId?: string;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly payload: T;
    readonly metadata?: Record<string, PropertyValue>;
}
export declare class WorldEvent {
    readonly id: string;
    readonly type: EventType;
    readonly source: string;
    readonly timestamp: number;
    readonly tenantId?: string;
    readonly entityId?: string;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly payload: Readonly<Record<string, PropertyValue>>;
    readonly metadata: Readonly<Record<string, PropertyValue>>;
    constructor(envelope: Partial<EventEnvelope> & {
        type: EventType;
        payload: Record<string, PropertyValue>;
    });
    getPayload<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined;
    toEnvelope(): EventEnvelope;
    toJSON(): Record<string, unknown>;
    static fromEnvelope(envelope: EventEnvelope): WorldEvent;
}
//# sourceMappingURL=Event.d.ts.map