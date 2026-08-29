/**
 * @file ComparisonEngine.ts
 * @description Side-by-side delta analysis comparing baseline Digital Twin state against simulated scenario state.
 */

import { WorldModel, type PropertyValue } from '@synapse/world-engine';
import { DigitalTwin } from '@synapse/twin-engine';

export interface PropertyDelta {
  readonly baselineValue: PropertyValue;
  readonly simulatedValue: PropertyValue;
  readonly difference?: number | string;
  readonly percentChange?: number;
}

export interface EntityComparison {
  readonly entityId: string;
  readonly entityType: string;
  readonly statusChange?: { baseline: string; simulated: string };
  readonly modifiedProperties: Record<string, PropertyDelta>;
}

export interface ScenarioComparisonReport {
  readonly baselineTwinId: string;
  readonly simulatedModelId: string;
  readonly timestamp: number;
  readonly modifiedEntitiesCount: number;
  readonly entityComparisons: readonly EntityComparison[];
  readonly addedEntities: readonly string[];
  readonly removedEntities: readonly string[];
  readonly executiveSummary: {
    readonly degradedEntities: readonly string[];
    readonly crashedEntities: readonly string[];
    readonly maxLatencyIncreaseMs?: number;
    readonly totalImpactedEntitiesCount: number;
  };
}

export class ComparisonEngine {
  /**
   * Compares baseline Digital Twin model against the simulated outcome WorldModel.
   */
  public static compare(baselineTwin: DigitalTwin, simulatedModel: WorldModel): ScenarioComparisonReport {
    const baselineModel = baselineTwin.model;
    const baseEntities = baselineModel.getAllEntities();
    const simEntities = simulatedModel.getAllEntities();

    const baseMap = new Map(baseEntities.map((e) => [e.id, e]));
    const simMap = new Map(simEntities.map((e) => [e.id, e]));

    const addedEntities: string[] = [];
    const removedEntities: string[] = [];
    const entityComparisons: EntityComparison[] = [];
    const degradedEntities: string[] = [];
    const crashedEntities: string[] = [];

    let maxLatencyIncrease = 0;

    // Check simulated entities against baseline
    for (const [id, simEntity] of simMap) {
      const baseEntity = baseMap.get(id);

      if (!baseEntity) {
        addedEntities.push(id);
      } else {
        const propDeltas: Record<string, PropertyDelta> = {};
        const allKeys = new Set([...Object.keys(baseEntity.properties), ...Object.keys(simEntity.properties)]);

        for (const key of allKeys) {
          const valBase = baseEntity.properties[key];
          const valSim = simEntity.properties[key];

          if (JSON.stringify(valBase) !== JSON.stringify(valSim)) {
            let percentChange: number | undefined;
            let diff: number | string | undefined;

            if (typeof valBase === 'number' && typeof valSim === 'number') {
              diff = Number((valSim - valBase).toFixed(4));
              if (valBase !== 0) {
                percentChange = Number((((valSim - valBase) / Math.abs(valBase)) * 100).toFixed(2));
              }

              if (key === 'latencyMs' && diff > maxLatencyIncrease) {
                maxLatencyIncrease = diff;
              }
            } else {
              diff = `${String(valBase)} -> ${String(valSim)}`;
            }

            propDeltas[key] = {
              baselineValue: valBase,
              simulatedValue: valSim,
              difference: diff,
              percentChange,
            };
          }
        }

        const statusChanged = baseEntity.status !== simEntity.status;
        if (simEntity.status === 'degraded' || simEntity.properties['status'] === 'degraded') {
          degradedEntities.push(id);
        }
        if (simEntity.status === 'inactive' || simEntity.properties['status'] === 'inactive' || simEntity.properties['available'] === false) {
          crashedEntities.push(id);
        }

        if (Object.keys(propDeltas).length > 0 || statusChanged) {
          entityComparisons.push({
            entityId: id,
            entityType: simEntity.type,
            statusChange: statusChanged ? { baseline: baseEntity.status, simulated: simEntity.status } : undefined,
            modifiedProperties: propDeltas,
          });
        }
      }
    }

    for (const [id] of baseMap) {
      if (!simMap.has(id)) {
        removedEntities.push(id);
      }
    }

    return {
      baselineTwinId: baselineTwin.id,
      simulatedModelId: simulatedModel.id,
      timestamp: Date.now(),
      modifiedEntitiesCount: entityComparisons.length,
      entityComparisons: Object.freeze(entityComparisons),
      addedEntities: Object.freeze(addedEntities),
      removedEntities: Object.freeze(removedEntities),
      executiveSummary: {
        degradedEntities: Object.freeze(degradedEntities),
        crashedEntities: Object.freeze(crashedEntities),
        maxLatencyIncreaseMs: maxLatencyIncrease > 0 ? maxLatencyIncrease : undefined,
        totalImpactedEntitiesCount: entityComparisons.length + addedEntities.length + removedEntities.length,
      },
    };
  }
}
