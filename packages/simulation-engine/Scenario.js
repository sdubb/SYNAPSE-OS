/**
 * @file Scenario.ts
 * @description Scenario definition containing parameter overrides, environment mutations, event injections, and KPI targets for what-if simulation.
 */
export class Scenario {
    id;
    name;
    description;
    durationMs;
    stepDeltaMs;
    baselineTwinId;
    parameters;
    mutations;
    injectedEvents;
    stochasticParameters;
    kpis;
    tags;
    constructor(config) {
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
    clone(overrides) {
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
    toJSON() {
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
//# sourceMappingURL=Scenario.js.map