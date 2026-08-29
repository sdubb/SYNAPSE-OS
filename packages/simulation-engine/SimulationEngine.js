/**
 * @file SimulationEngine.ts
 * @description Master orchestrator coordinating discrete-event simulations, scenario runs, agent sandboxing, Monte Carlo sweeps, and delta analysis.
 */
import { ScenarioBuilder } from './ScenarioBuilder.js';
import { SimulationClock } from './SimulationClock.js';
import { EventSimulator } from './EventSimulator.js';
import { StateTransitionEngine } from './StateTransition.js';
import { RuleEngine } from './RuleEngine.js';
import { ConstraintEngine } from './ConstraintEngine.js';
import { AgentSandbox } from './AgentSandbox.js';
import { MonteCarloRunner } from './MonteCarloRunner.js';
import { ResultAnalyzer } from './ResultAnalyzer.js';
import { ComparisonEngine } from './ComparisonEngine.js';
export class SimulationEngine {
    _ruleEngine;
    _constraintEngine;
    _activeSandboxes = new Map();
    constructor() {
        this._ruleEngine = new RuleEngine();
        this._constraintEngine = new ConstraintEngine();
        // Default safety boundaries
        this._constraintEngine.registerSafetyBoundary(ConstraintEngine.createMaxLatencyBoundary());
        this._constraintEngine.registerSafetyBoundary(ConstraintEngine.createMaxErrorRateBoundary());
    }
    get ruleEngine() {
        return this._ruleEngine;
    }
    get constraintEngine() {
        return this._constraintEngine;
    }
    createScenarioBuilder() {
        return new ScenarioBuilder();
    }
    /**
     * Runs a complete discrete-event simulation scenario against a digital twin baseline.
     */
    async runScenario(twin, scenario) {
        const startTime = Date.now();
        const runId = `sim_run_${scenario.id}_${Date.now()}`;
        // 1. Fork isolated model from baseline Digital Twin
        let simModel = twin.model.clone({ id: `sim_model_${runId}`, version: 1 });
        const initialModel = simModel;
        // 2. Initialize discrete-event clock and simulator
        const clock = new SimulationClock(0, 1.0);
        const eventSimulator = new EventSimulator(clock);
        const transitionEngine = new StateTransitionEngine();
        const stepReports = [];
        // 3. Schedule initial parameter overrides & mutations
        for (const mutation of scenario.mutations) {
            const applyTime = mutation.applyAtVirtualTime ?? 0;
            clock.schedule(applyTime, () => {
                if (mutation.entityId) {
                    const entity = simModel.getEntity(mutation.entityId);
                    if (entity) {
                        const res = transitionEngine.applyTransition(entity, { [mutation.propertyKey]: mutation.newValue }, clock.currentTime, mutation.description ?? 'Scenario environment mutation');
                        simModel = simModel.withEntity(res.updatedEntity);
                    }
                }
            }, mutation);
        }
        // 4. Schedule injected world events
        for (const inj of scenario.injectedEvents) {
            clock.schedule(inj.virtualTimeOffsetMs, async () => {
                const res = await eventSimulator.routeEvent(simModel, inj.event);
                simModel = res.updatedModel;
            }, inj);
        }
        // 5. Execute time steps
        const stepDelta = scenario.stepDeltaMs;
        const totalDuration = scenario.durationMs;
        let currentVirtualTime = 0;
        while (currentVirtualTime <= totalDuration) {
            // Advance clock and execute scheduled tasks
            await clock.advanceTo(currentVirtualTime);
            // Evaluate business rules
            const ruleOutcome = this._ruleEngine.evaluateRules(simModel);
            simModel = ruleOutcome.updatedModel;
            // Evaluate safety constraints and operational boundaries
            const stepReport = this._constraintEngine.evaluate(simModel, currentVirtualTime);
            stepReports.push(stepReport);
            currentVirtualTime += stepDelta;
        }
        const executionRealMs = Date.now() - startTime;
        // 6. Analyze KPIs and outcome
        const outcome = ResultAnalyzer.analyzeRun({
            runId,
            scenario,
            finalModel: simModel,
            stepReports,
            executionRealMs,
        });
        // 7. Perform delta comparison against baseline twin
        const comparison = ComparisonEngine.compare(twin, simModel);
        return {
            runId,
            scenario,
            initialModel,
            finalModel: simModel,
            outcome,
            comparison,
            stepReports: Object.freeze(stepReports),
            durationRealMs: executionRealMs,
        };
    }
    /**
     * Executes a Monte Carlo parameter sweep across stochastic distributions.
     */
    async runMonteCarloSweep(twin, scenario, iterationsCount = 50) {
        return MonteCarloRunner.runSweep(scenario, iterationsCount, async (_iterIdx, sampledParams) => {
            // Create parameter override scenario clone
            const iterScenario = scenario.clone({
                parameters: sampledParams,
                // Apply stochastic variables to mutations if key matches
                mutations: scenario.mutations.map((m) => {
                    if (sampledParams[m.propertyKey] !== undefined) {
                        return { ...m, newValue: sampledParams[m.propertyKey] };
                    }
                    return m;
                }),
            });
            const runResult = await this.runScenario(twin, iterScenario);
            const metrics = {
                safetyRiskScore: runResult.outcome.safetyRiskScore,
                violationsCount: runResult.outcome.constraintViolationsCount,
                totalImpactedEntities: runResult.comparison.executiveSummary.totalImpactedEntitiesCount,
            };
            for (const kpi of runResult.outcome.kpiResults) {
                if (kpi.actualValue !== undefined) {
                    metrics[kpi.kpiName] = kpi.actualValue;
                }
            }
            return {
                metrics,
                passed: runResult.outcome.allKPIsPassed && runResult.outcome.riskLevel !== 'critical',
                violationsCount: runResult.outcome.constraintViolationsCount,
            };
        });
    }
    /**
     * Creates an isolated agent sandbox for safe dry-runs.
     */
    createAgentSandbox(sandboxId, agentId, baseTwin) {
        const sandbox = new AgentSandbox(sandboxId, agentId, baseTwin);
        this._activeSandboxes.set(sandboxId, sandbox);
        return sandbox;
    }
    getAgentSandbox(sandboxId) {
        return this._activeSandboxes.get(sandboxId);
    }
    closeAgentSandbox(sandboxId) {
        return this._activeSandboxes.delete(sandboxId);
    }
}
//# sourceMappingURL=SimulationEngine.js.map