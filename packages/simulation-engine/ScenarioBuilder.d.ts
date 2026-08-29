/**
 * @file ScenarioBuilder.ts
 * @description Fluent builder API for constructing what-if scenarios, environment mutations, event injections, and stress tests.
 */
import { WorldEvent, type PropertyValue } from '@synapse/world-engine';
import { Scenario } from './Scenario.js';
export declare class ScenarioBuilder {
    private _id?;
    private _name?;
    private _description?;
    private _durationMs;
    private _stepDeltaMs;
    private _baselineTwinId?;
    private _parameters;
    private _mutations;
    private _injectedEvents;
    private _stochasticParameters;
    private _kpis;
    private _tags;
    withId(id: string): this;
    withName(name: string): this;
    withDescription(description: string): this;
    withDuration(durationMs: number, stepDeltaMs?: number): this;
    forTwin(twinId: string): this;
    withParameter(key: string, value: PropertyValue): this;
    withParameters(params: Record<string, PropertyValue>): this;
    /**
     * Mutates an entity property at a given simulation timestamp.
     */
    mutateEntity(entityId: string, propertyKey: string, newValue: PropertyValue, applyAtVirtualTime?: number, description?: string): this;
    /**
     * Injects a network latency or service degraded status mutation.
     */
    injectServiceDegradation(serviceEntityId: string, latencyMs: number, errorRatePercent?: number, applyAtVirtualTime?: number): this;
    /**
     * Injects a complete service outage.
     */
    injectServiceOutage(serviceEntityId: string, applyAtVirtualTime?: number): this;
    /**
     * Schedules a discrete world event injection at a specific virtual time offset.
     */
    injectEvent(virtualTimeOffsetMs: number, event: WorldEvent, description?: string): this;
    /**
     * Adds a stochastic variable with Gaussian / Normal distribution for Monte Carlo sweeps.
     */
    withGaussianVariable(name: string, mean: number, stdDev: number): this;
    /**
     * Adds a uniform random parameter distribution.
     */
    withUniformVariable(name: string, min: number, max: number): this;
    /**
     * Adds a target KPI condition to evaluate success/failure of the scenario.
     */
    addKPI(id: string, name: string, propertyKey: string, condition: 'greater_than' | 'less_than' | 'equals' | 'between', targetValues: number[], entityId?: string, unit?: string): this;
    withTag(tag: string): this;
    build(): Scenario;
}
//# sourceMappingURL=ScenarioBuilder.d.ts.map