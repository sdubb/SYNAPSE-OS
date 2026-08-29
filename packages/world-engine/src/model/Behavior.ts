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

export type BehaviorExecutionHandler = (
  event: WorldEvent,
  entity: Entity,
  context: BehaviorExecutionContext
) => BehaviorResult | Promise<BehaviorResult>;

export interface BehaviorConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly targetEntityTypes: readonly string[];
  readonly triggerEventTypes: readonly string[];
  readonly priority?: number;
  readonly enabled?: boolean;
}

export class Behavior {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly targetEntityTypes: readonly string[];
  public readonly triggerEventTypes: readonly string[];
  public readonly priority: number;
  public readonly enabled: boolean;

  private readonly _triggerPredicate?: BehaviorTriggerPredicate;
  private readonly _handler: BehaviorExecutionHandler;

  constructor(
    config: BehaviorConfig,
    handler: BehaviorExecutionHandler,
    triggerPredicate?: BehaviorTriggerPredicate
  ) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.targetEntityTypes = Object.freeze([...config.targetEntityTypes]);
    this.triggerEventTypes = Object.freeze([...config.triggerEventTypes]);
    this.priority = config.priority ?? 100;
    this.enabled = config.enabled ?? true;
    this._handler = handler;
    this._triggerPredicate = triggerPredicate;
  }

  public matches(event: WorldEvent, entity: Entity): boolean {
    if (!this.enabled) return false;

    // Entity type check
    if (this.targetEntityTypes.length > 0 && !this.targetEntityTypes.includes(entity.type) && !this.targetEntityTypes.includes('*')) {
      return false;
    }

    // Event type check
    if (this.triggerEventTypes.length > 0 && !this.triggerEventTypes.includes(event.type) && !this.triggerEventTypes.includes('*')) {
      return false;
    }

    // Specific predicate check if provided
    if (this._triggerPredicate) {
      return this._triggerPredicate(event, entity);
    }

    return true;
  }

  public async execute(
    event: WorldEvent,
    entity: Entity,
    context: BehaviorExecutionContext
  ): Promise<BehaviorResult> {
    if (!this.matches(event, entity)) {
      return { handled: false };
    }

    try {
      const result = await this._handler(event, entity, context);
      return result;
    } catch (err) {
      return {
        handled: true,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }
}
