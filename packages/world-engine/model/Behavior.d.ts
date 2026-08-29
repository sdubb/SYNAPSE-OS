/**
 * @file Behavior.ts
 * @description Dynamic behavioral rule defining how entities react to discrete world events and compute state updates.
 */
import type { Entity } from './Entity.js';
import type { WorldEvent } from './Event.js';
import type { PropertyValue } from './State.js';
export interface BehaviorExecutionContext {
    readonly currentTimestamp: number;
    readonly getEntity: (id: string) => Entity | undefined;
    readonly getRelatedEntities: (entityId: string, relationType?: string) => readonly Entity[];
    readonly emitEvent: (event: WorldEvent) => void;
    readonly globalVariables?: Record<string, PropertyValue>;
}
export interface BehaviorResult {
    readonly handled: boolean;
    readonly stateUpdates?: Record<string, PropertyValue>;
    readonly emittedEvents?: WorldEvent[];
    readonly sideEffects?: string[];
    readonly error?: Error;
}
export type BehaviorTriggerPredicate = (event: WorldEvent, entity: Entity) => boolean;
export type BehaviorExecutionHandler = (event: WorldEvent, entity: Entity, context: BehaviorExecutionContext) => BehaviorResult | Promise<BehaviorResult>;
export interface BehaviorConfig {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly targetEntityTypes: readonly string[];
    readonly triggerEventTypes: readonly string[];
    readonly priority?: number;
    readonly enabled?: boolean;
}
export declare class Behavior {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly targetEntityTypes: readonly string[];
    readonly triggerEventTypes: readonly string[];
    readonly priority: number;
    readonly enabled: boolean;
    private readonly _triggerPredicate?;
    private readonly _handler;
    constructor(config: BehaviorConfig, handler: BehaviorExecutionHandler, triggerPredicate?: BehaviorTriggerPredicate);
    matches(event: WorldEvent, entity: Entity): boolean;
    execute(event: WorldEvent, entity: Entity, context: BehaviorExecutionContext): Promise<BehaviorResult>;
}
//# sourceMappingURL=Behavior.d.ts.map