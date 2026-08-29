/**
 * @file ScenarioBuilder.ts
 * @description Fluent builder API for constructing what-if scenarios, environment mutations, event injections, and stress tests.
 */

import { WorldEvent, type PropertyValue } from '@synapse/world-engine';
import {
  Scenario,
  type EnvironmentMutation,
  type InjectedEventConfig,
  type StochasticParameter,
  type KPITarget,
} from './Scenario.js';

export class ScenarioBuilder {
  private _id?: string;
  private _name?: string;
  private _description?: string;
  private _durationMs = 60000; // 60s default
  private _stepDeltaMs = 1000;  // 1s default tick
  private _baselineTwinId?: string;
  private _parameters: Record<string, PropertyValue> = {};
  private _mutations: EnvironmentMutation[] = [];
  private _injectedEvents: InjectedEventConfig[] = [];
  private _stochasticParameters: StochasticParameter[] = [];
  private _kpis: KPITarget[] = [];
  private _tags: string[] = [];

  public withId(id: string): this {
    this._id = id;
    return this;
  }

  public withName(name: string): this {
    this._name = name;
    return this;
  }

  public withDescription(description: string): this {
    this._description = description;
    return this;
  }

  public withDuration(durationMs: number, stepDeltaMs = 1000): this {
    this._durationMs = durationMs;
    this._stepDeltaMs = stepDeltaMs;
    return this;
  }

  public forTwin(twinId: string): this {
    this._baselineTwinId = twinId;
    return this;
  }

  public withParameter(key: string, value: PropertyValue): this {
    this._parameters[key] = value;
    return this;
  }

  public withParameters(params: Record<string, PropertyValue>): this {
    Object.assign(this._parameters, params);
    return this;
  }

  /**
   * Mutates an entity property at a given simulation timestamp.
   */
  public mutateEntity(
    entityId: string,
    propertyKey: string,
    newValue: PropertyValue,
    applyAtVirtualTime = 0,
    description?: string
  ): this {
    this._mutations.push({
      id: `mut_${entityId}_${propertyKey}_${applyAtVirtualTime}`,
      entityId,
      propertyKey,
      newValue,
      applyAtVirtualTime,
      description,
    });
    return this;
  }

  /**
   * Injects a network latency or service degraded status mutation.
   */
  public injectServiceDegradation(
    serviceEntityId: string,
    latencyMs: number,
    errorRatePercent = 20,
    applyAtVirtualTime = 0
  ): this {
    this.mutateEntity(serviceEntityId, 'latencyMs', latencyMs, applyAtVirtualTime, 'Injected service latency');
    this.mutateEntity(serviceEntityId, 'errorRate', errorRatePercent, applyAtVirtualTime, 'Injected error rate');
    this.mutateEntity(serviceEntityId, 'status', 'degraded', applyAtVirtualTime, 'Set status to degraded');
    return this;
  }

  /**
   * Injects a complete service outage.
   */
  public injectServiceOutage(serviceEntityId: string, applyAtVirtualTime = 0): this {
    this.mutateEntity(serviceEntityId, 'status', 'inactive', applyAtVirtualTime, 'Service shutdown');
    this.mutateEntity(serviceEntityId, 'available', false, applyAtVirtualTime, 'Service unavailable');
    return this;
  }

  /**
   * Schedules a discrete world event injection at a specific virtual time offset.
   */
  public injectEvent(virtualTimeOffsetMs: number, event: WorldEvent, description?: string): this {
    this._injectedEvents.push({
      id: `inj_${event.id}_${virtualTimeOffsetMs}`,
      virtualTimeOffsetMs,
      event,
      description,
    });
    return this;
  }

  /**
   * Adds a stochastic variable with Gaussian / Normal distribution for Monte Carlo sweeps.
   */
  public withGaussianVariable(name: string, mean: number, stdDev: number): this {
    this._stochasticParameters.push({
      name,
      distribution: 'gaussian',
      params: { mean, stdDev },
    });
    return this;
  }

  /**
   * Adds a uniform random parameter distribution.
   */
  public withUniformVariable(name: string, min: number, max: number): this {
    this._stochasticParameters.push({
      name,
      distribution: 'uniform',
      params: { min, max },
    });
    return this;
  }

  /**
   * Adds a target KPI condition to evaluate success/failure of the scenario.
   */
  public addKPI(
    id: string,
    name: string,
    propertyKey: string,
    condition: 'greater_than' | 'less_than' | 'equals' | 'between',
    targetValues: number[],
    entityId?: string,
    unit?: string
  ): this {
    this._kpis.push({
      id,
      name,
      propertyKey,
      targetCondition: condition,
      targetValues,
      entityId,
      unit,
    });
    return this;
  }

  public withTag(tag: string): this {
    this._tags.push(tag);
    return this;
  }

  public build(): Scenario {
    const id = this._id ?? `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const name = this._name ?? `Scenario ${id}`;

    return new Scenario({
      id,
      name,
      description: this._description,
      durationMs: this._durationMs,
      stepDeltaMs: this._stepDeltaMs,
      baselineTwinId: this._baselineTwinId,
      parameters: this._parameters,
      mutations: this._mutations,
      injectedEvents: this._injectedEvents,
      stochasticParameters: this._stochasticParameters,
      kpis: this._kpis,
      tags: this._tags,
    });
  }
}
