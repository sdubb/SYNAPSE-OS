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
  readonly applyAtVirtualTime?: number; // 0 = start of scenario
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

export class Scenario {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly durationMs: number;
  public readonly stepDeltaMs: number;
  public readonly baselineTwinId?: string;
  public readonly parameters: Readonly<Record<string, PropertyValue>>;
  public readonly mutations: readonly EnvironmentMutation[];
  public readonly injectedEvents: readonly InjectedEventConfig[];
  public readonly stochasticParameters: readonly StochasticParameter[];
  public readonly kpis: readonly KPITarget[];
  public readonly tags: readonly string[];

  constructor(config: ScenarioConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.durationMs = config.durationMs;
    this.stepDeltaMs = config.stepDeltaMs ?? 1000;
    this.baselineTwinId = config.baselineTwinId;
    this.parameters = Object.freeze(config.parameters ? { ...config.parameters } : {});
    this.mutations = Object.freeze(config.mutations ? [...config.mutations] : []);
    this.injectedEvents = Object.freeze(config.injectedEvents ? [...config.injectedEvents] : []);
    this.stochasticParameters = Object.freeze(config.stochasticParameters ? [...config.stochasticParameters] : []);
    this.kpis = Object.freeze(config.kpis ? [...config.kpis] : []);
    this.tags = Object.freeze(config.tags ? [...config.tags] : []);
  }

  public clone(overrides?: Partial<ScenarioConfig>): Scenario {
    return new Scenario({
      id: overrides?.id ?? this.id,
      name: overrides?.name ?? this.name,
      description: overrides?.description ?? this.description,
      durationMs: overrides?.durationMs ?? this.durationMs,
      stepDeltaMs: overrides?.stepDeltaMs ?? this.stepDeltaMs,
      baselineTwinId: overrides?.baselineTwinId ?? this.baselineTwinId,
      parameters: overrides?.parameters ?? { ...this.parameters },
      mutations: overrides?.mutations ?? this.mutations,
      injectedEvents: overrides?.injectedEvents ?? this.injectedEvents,
      stochasticParameters: overrides?.stochasticParameters ?? this.stochasticParameters,
      kpis: overrides?.kpis ?? this.kpis,
      tags: overrides?.tags ?? this.tags,
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      durationMs: this.durationMs,
      stepDeltaMs: this.stepDeltaMs,
      baselineTwinId: this.baselineTwinId,
      parameters: this.parameters,
      mutations: this.mutations,
      injectedEvents: this.injectedEvents,
      stochasticParameters: this.stochasticParameters,
      kpis: this.kpis,
      tags: this.tags,
    };
  }
}
