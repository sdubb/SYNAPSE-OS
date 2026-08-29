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
    readonly statusChange?: {
        baseline: string;
        simulated: string;
    };
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
export declare class ComparisonEngine {
    /**
     * Compares baseline Digital Twin model against the simulated outcome WorldModel.
     */
    static compare(baselineTwin: DigitalTwin, simulatedModel: WorldModel): ScenarioComparisonReport;
}
//# sourceMappingURL=ComparisonEngine.d.ts.map