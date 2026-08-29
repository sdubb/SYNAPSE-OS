/**
 * @file MonteCarloRunner.ts
 * @description Executes stochastic parameter variation sweeps and computes statistical distributions, percentiles, and risk probabilities.
 */
import { Scenario, type StochasticParameter } from './Scenario.js';
import type { PropertyValue } from '@synapse/world-engine';
export interface MonteCarloRunIteration {
    readonly iterationIndex: number;
    readonly sampledParameters: Record<string, PropertyValue>;
    readonly metricValues: Record<string, number>;
    readonly passedKPIs: boolean;
    readonly violationsCount: number;
}
export interface MetricDistributionStats {
    readonly metricName: string;
    readonly sampleCount: number;
    readonly min: number;
    readonly max: number;
    readonly mean: number;
    readonly stdDev: number;
    readonly variance: number;
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
    readonly p99: number;
}
export interface MonteCarloSweepResult {
    readonly sweepId: string;
    readonly scenarioId: string;
    readonly iterationsCount: number;
    readonly successRatePercent: number;
    readonly failureRatePercent: number;
    readonly metricDistributions: Record<string, MetricDistributionStats>;
    readonly iterations: readonly MonteCarloRunIteration[];
    readonly durationMs: number;
}
export declare class MonteCarloRunner {
    /**
     * Executes a Monte Carlo simulation sweep over stochastic parameters.
     */
    static runSweep(scenario: Scenario, iterationsCount: number, runSingleIteration: (iterationIndex: number, sampledParams: Record<string, PropertyValue>) => Promise<{
        metrics: Record<string, number>;
        passed: boolean;
        violationsCount: number;
    }>): Promise<MonteCarloSweepResult>;
    /**
     * Generates stochastic samples for defined parameters.
     */
    static sampleParameters(stochasticParams: readonly StochasticParameter[], baseParams: Record<string, PropertyValue>): Record<string, PropertyValue>;
    private static sampleValue;
    static computeDistributionStats(metricName: string, samples: number[]): MetricDistributionStats;
    private static getPercentile;
}
//# sourceMappingURL=MonteCarloRunner.d.ts.map