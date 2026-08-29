/**
 * @file ScenarioBuilder.ts
 * @description Fluent builder API for constructing what-if scenarios, environment mutations, event injections, and stress tests.
 */
import { Scenario, } from './Scenario.js';
export class ScenarioBuilder {
    _id;
    _name;
    _description;
    _durationMs = 60000; // 60s default
    _stepDeltaMs = 1000; // 1s default tick
    _baselineTwinId;
    _parameters = {};
    _mutations = [];
    _injectedEvents = [];
    _stochasticParameters = [];
    _kpis = [];
    _tags = [];
    withId(id) {
        this._id = id;
        return this;
    }
    withName(name) {
        this._name = name;
        return this;
    }
    withDescription(description) {
        this._description = description;
        return this;
    }
    withDuration(durationMs, stepDeltaMs = 1000) {
        this._durationMs = durationMs;
        this._stepDeltaMs = stepDeltaMs;
        return this;
    }
    forTwin(twinId) {
        this._baselineTwinId = twinId;
        return this;
    }
    withParameter(key, value) {
        this._parameters[key] = value;
        return this;
    }
    withParameters(params) {
        Object.assign(this._parameters, params);
        return this;
    }
    /**
     * Mutates an entity property at a given simulation timestamp.
     */
    mutateEntity(entityId, propertyKey, newValue, applyAtVirtualTime = 0, description) {
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
    injectServiceDegradation(serviceEntityId, latencyMs, errorRatePercent = 20, applyAtVirtualTime = 0) {
        this.mutateEntity(serviceEntityId, 'latencyMs', latencyMs, applyAtVirtualTime, 'Injected service latency');
        this.mutateEntity(serviceEntityId, 'errorRate', errorRatePercent, applyAtVirtualTime, 'Injected error rate');
        this.mutateEntity(serviceEntityId, 'status', 'degraded', applyAtVirtualTime, 'Set status to degraded');
        return this;
    }
    /**
     * Injects a complete service outage.
     */
    injectServiceOutage(serviceEntityId, applyAtVirtualTime = 0) {
        this.mutateEntity(serviceEntityId, 'status', 'inactive', applyAtVirtualTime, 'Service shutdown');
        this.mutateEntity(serviceEntityId, 'available', false, applyAtVirtualTime, 'Service unavailable');
        return this;
    }
    /**
     * Schedules a discrete world event injection at a specific virtual time offset.
     */
    injectEvent(virtualTimeOffsetMs, event, description) {
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
    withGaussianVariable(name, mean, stdDev) {
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
    withUniformVariable(name, min, max) {
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
    addKPI(id, name, propertyKey, condition, targetValues, entityId, unit) {
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
    withTag(tag) {
        this._tags.push(tag);
        return this;
    }
    build() {
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
//# sourceMappingURL=ScenarioBuilder.js.map