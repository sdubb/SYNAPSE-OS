/**
 * @file ResultAnalyzer.ts
 * @description Analyzes simulation outcomes, evaluates KPI targets, calculates risk indexes, MTTR, and failure severity distributions.
 */
import type { WorldModel } from '@synapse/world-engine';
import type { Scenario } from './Scenario.js';
import type { ConstraintEvaluationReport } from './ConstraintEngine.js';
export interface KPIEvaluationResult {
    readonly kpiId: string;
    readonly kpiName: string;
    readonly targetCondition: string;
    readonly targetValues: readonly number[];
    readonly actualValue: number | undefined;
    readonly passed: boolean;
    readonly margin: number;
}
export interface SimulationOutcomeReport {
    readonly runId: string;
    readonly scenarioId: string;
    readonly durationVirtualMs: number;
    readonly executionRealMs: number;
    readonly totalSteps: number;
    readonly kpiResults: readonly KPIEvaluationResult[];
    readonly allKPIsPassed: boolean;
    readonly constraintViolationsCount: number;
    readonly safetyRiskScore: number;
    readonly riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    readonly recommendations: readonly string[];
}
export declare class ResultAnalyzer {
    /**
     * Evaluates final world state against scenario KPIs and safety constraint logs.
     */
    static analyzeRun(params: {
        runId: string;
        scenario: Scenario;
        finalModel: WorldModel;
        stepReports: readonly ConstraintEvaluationReport[];
        executionRealMs: number;
    }): SimulationOutcomeReport;
    private static extractKPIValue;
    private static evaluateKPI;
}
//# sourceMappingURL=ResultAnalyzer.d.ts.map