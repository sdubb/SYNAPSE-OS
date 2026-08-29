/**
 * @file SimulationEngine.ts
 * @description Master orchestrator coordinating discrete-event simulations, scenario runs, agent sandboxing, Monte Carlo sweeps, and delta analysis.
 */
import { WorldModel } from '@synapse/world-engine';
import { DigitalTwin } from '@synapse/twin-engine';
import { Scenario } from './Scenario.js';
import { ScenarioBuilder } from './ScenarioBuilder.js';
import { RuleEngine } from './RuleEngine.js';
import { ConstraintEngine, type ConstraintEvaluationReport } from './ConstraintEngine.js';
import { AgentSandbox } from './AgentSandbox.js';
import { type MonteCarloSweepResult } from './MonteCarloRunner.js';
import { type SimulationOutcomeReport } from './ResultAnalyzer.js';
import { type ScenarioComparisonReport } from './ComparisonEngine.js';
export interface SimulationRunResult {
    readonly runId: string;
    readonly scenario: Scenario;
    readonly initialModel: WorldModel;
    readonly finalModel: WorldModel;
    readonly outcome: SimulationOutcomeReport;
    readonly comparison: ScenarioComparisonReport;
    readonly stepReports: readonly ConstraintEvaluationReport[];
    readonly durationRealMs: number;
}
export declare class SimulationEngine {
    private readonly _ruleEngine;
    private readonly _constraintEngine;
    private readonly _activeSandboxes;
    constructor();
    get ruleEngine(): RuleEngine;
    get constraintEngine(): ConstraintEngine;
    createScenarioBuilder(): ScenarioBuilder;
    /**
     * Runs a complete discrete-event simulation scenario against a digital twin baseline.
     */
    runScenario(twin: DigitalTwin, scenario: Scenario): Promise<SimulationRunResult>;
    /**
     * Executes a Monte Carlo parameter sweep across stochastic distributions.
     */
    runMonteCarloSweep(twin: DigitalTwin, scenario: Scenario, iterationsCount?: number): Promise<MonteCarloSweepResult>;
    /**
     * Creates an isolated agent sandbox for safe dry-runs.
     */
    createAgentSandbox(sandboxId: string, agentId: string, baseTwin: DigitalTwin): AgentSandbox;
    getAgentSandbox(sandboxId: string): AgentSandbox | undefined;
    closeAgentSandbox(sandboxId: string): boolean;
}
//# sourceMappingURL=SimulationEngine.d.ts.map