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
  readonly propertyDiff: Record<string, { from: PropertyValue; to: PropertyValue }>;
  readonly reason: string;
  readonly durationMs?: number;
}

export class StateTransitionEngine {
  private readonly _history: StateTransitionRecord[] = [];

  public get history(): readonly StateTransitionRecord[] {
    return this._history;
  }

  /**
   * Applies state updates to an entity, generating a transition record.
   */
  public applyTransition(
    entity: Entity,
    stateUpdates: Record<string, PropertyValue>,
    virtualTimestamp: number,
    reason: string,
    triggerEvent?: WorldEvent
  ): { updatedEntity: Entity; record: StateTransitionRecord } {
    const previousState: Record<string, PropertyValue> = { ...entity.properties };
    const propertyDiff: Record<string, { from: PropertyValue; to: PropertyValue }> = {};

    for (const [key, nextVal] of Object.entries(stateUpdates)) {
      const prevVal = previousState[key];
      if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
        propertyDiff[key] = { from: prevVal as PropertyValue, to: nextVal };
      }
    }

    const updatedEntity = entity.cloneWithState(stateUpdates, {
      updatedAt: virtualTimestamp,
      sourceSystem: `Simulation:${reason}`,
    });

    const record: StateTransitionRecord = {
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

  public getTransitionsForEntity(entityId: string): StateTransitionRecord[] {
    return this._history.filter((h) => h.entityId === entityId);
  }

  public clearHistory(): void {
    this._history.length = 0;
  }
}
