/**
 * @file Scenario.ts
 * @description Scenario definition containing parameter overrides, environment mutations, event injections, and KPI targets for what-if simulation.
 */
import type { PropertyValue, WorldEvent } from '@synapse/world-engine';
export interface EnvironmentMutation {
    readonly id: string;
    readonly entityId?: string;
    readonly entityType?: string;
    readonly propertyKey: string;
    readonly newValue: PropertyValue;
    readonly applyAtVirtualTime?: number;
    readonly description?: string;
}
export interface InjectedEventConfig {
    readonly id: string;
    readonly virtualTimeOffsetMs: number;
    readonly event: WorldEvent;
    readonly description?: string;
}
export interface StochasticParameter {
    readonly name: string;
    readonly distribution: 'uniform' | 'gaussian' | 'poisson' | 'exponential' | 'choice';
    readonly params: {
        readonly min?: number;
        readonly max?: number;
        readonly mean?: number;
        readonly stdDev?: number;
        readonly lambda?: number;
        readonly choices?: readonly PropertyValue[];
    };
}
export interface KPITarget {
    readonly id: string;
    readonly name: string;
    readonly entityId?: string;
    readonly propertyKey: string;
    readonly targetCondition: 'greater_than' | 'less_than' | 'equals' | 'between';
    readonly targetValues: readonly number[];
    readonly unit?: string;
}
export interface ScenarioConfig {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly durationMs: number;
    readonly stepDeltaMs?: number;
    readonly baselineTwinId?: string;
    readonly parameters?: Record<string, PropertyValue>;
    readonly mutations?: readonly EnvironmentMutation[];
    readonly injectedEvents?: readonly InjectedEventConfig[];
    readonly stochasticParameters?: readonly StochasticParameter[];
    readonly kpis?: readonly KPITarget[];
    readonly tags?: readonly string[];
}
export declare class Scenario {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly durationMs: number;
    readonly stepDeltaMs: number;
    readonly baselineTwinId?: string;
    readonly parameters: Readonly<Record<string, PropertyValue>>;
    readonly mutations: readonly EnvironmentMutation[];
    readonly injectedEvents: readonly InjectedEventConfig[];
    readonly stochasticParameters: readonly StochasticParameter[];
    readonly kpis: readonly KPITarget[];
    readonly tags: readonly string[];
    constructor(config: ScenarioConfig);
    clone(overrides?: Partial<ScenarioConfig>): Scenario;
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=Scenario.d.ts.map