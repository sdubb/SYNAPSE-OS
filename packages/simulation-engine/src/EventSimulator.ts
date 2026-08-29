/**
 * @file EventSimulator.ts
 * @description Generates and routes simulated events through the entity graph with causal delay propagation and dependency cascading.
 */

import { WorldEvent, WorldModel, type BehaviorExecutionContext } from '@synapse/world-engine';
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

export class EventSimulator {
  private readonly _clock: SimulationClock;
  private readonly _traces: EventRouteTrace[] = [];

  constructor(clock: SimulationClock) {
    this._clock = clock;
  }

  public get traces(): readonly EventRouteTrace[] {
    return this._traces;
  }

  /**
   * Dispatches an event through the model, scheduling cascaded child events according to network delays.
   */
  public async routeEvent(
    model: WorldModel,
    event: WorldEvent,
    options: { propagationDelayMs?: number; maxCascadeDepth?: number } = {}
  ): Promise<{ updatedModel: WorldModel; generatedEvents: WorldEvent[] }> {
    let currentModel = model;
    const propagationDelay = options.propagationDelayMs ?? 50;
    const maxDepth = options.maxCascadeDepth ?? 5;
    const generatedEvents: WorldEvent[] = [];
    const mutatedEntityIds: string[] = [];

    const emittedQueue: Array<{ event: WorldEvent; depth: number }> = [{ event, depth: 0 }];

    while (emittedQueue.length > 0) {
      const { event: currentEvt, depth } = emittedQueue.shift()!;
      if (depth >= maxDepth) continue;

      const targetEntities = currentEvt.entityId
        ? [currentModel.getEntity(currentEvt.entityId)].filter((e): e is NonNullable<typeof e> => e !== undefined)
        : currentModel.getAllEntities();

      const nextLevelEmissions: WorldEvent[] = [];

      const context: BehaviorExecutionContext = {
        currentTimestamp: this._clock.currentTime,
        getEntity: (id: string) => currentModel.getEntity(id),
        getRelatedEntities: (entityId: string, relType?: string) => {
          const outRels = currentModel.getOutboundRelationships(entityId, relType);
          return outRels
            .map((r) => currentModel.getEntity(r.targetId))
            .filter((e): e is NonNullable<typeof e> => e !== undefined);
        },
        emitEvent: (childEvent: WorldEvent) => {
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
          this._clock.schedule(
            this._clock.currentTime + propagationDelay,
            async () => {
              emittedQueue.push({ event: childEvt, depth: depth + 1 });
            },
            childEvt
          );
        } else {
          emittedQueue.push({ event: childEvt, depth: depth + 1 });
        }
      }
    }

    return {
      updatedModel: currentModel,
      generatedEvents,
    };
  }

  public clearTraces(): void {
    this._traces.length = 0;
  }
}
