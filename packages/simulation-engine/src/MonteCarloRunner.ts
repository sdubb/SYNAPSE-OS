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
  readonly p50: number; // median
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

export class MonteCarloRunner {
  /**
   * Fast, deterministic 32-bit PRNG (Mulberry32)
   */
  public static createPrng(seed: number = Date.now()): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Executes a Monte Carlo simulation sweep over stochastic parameters.
   */
  public static async runSweep(
    scenario: Scenario,
    iterationsCount: number,
    runSingleIteration: (
      iterationIndex: number,
      sampledParams: Record<string, PropertyValue>
    ) => Promise<{ metrics: Record<string, number>; passed: boolean; violationsCount: number }>,
    seed?: number
  ): Promise<MonteCarloSweepResult> {
    const startTime = Date.now();
    const sweepId = `sweep_${scenario.id}_${Date.now()}`;
    const iterations: MonteCarloRunIteration[] = [];
    const prng = this.createPrng(seed ?? 42);

    const metricSamples: Record<string, number[]> = {};

    for (let i = 0; i < iterationsCount; i++) {
      const sampledParams = this.sampleParameters(scenario.stochasticParameters, scenario.parameters, prng);

      const result = await runSingleIteration(i, sampledParams);

      iterations.push({
        iterationIndex: i,
        sampledParameters: sampledParams,
        metricValues: result.metrics,
        passedKPIs: result.passed,
        violationsCount: result.violationsCount,
      });

      for (const [metricKey, val] of Object.entries(result.metrics)) {
        if (!metricSamples[metricKey]) {
          metricSamples[metricKey] = [];
        }
        metricSamples[metricKey]!.push(val);
      }
    }

    // Compute distribution statistics for all tracked metrics
    const metricDistributions: Record<string, MetricDistributionStats> = {};
    for (const [metricKey, samples] of Object.entries(metricSamples)) {
      metricDistributions[metricKey] = this.computeDistributionStats(metricKey, samples);
    }

    const passedCount = iterations.filter((it) => it.passedKPIs).length;
    const successRatePercent = Number(((passedCount / iterationsCount) * 100).toFixed(2));
    const failureRatePercent = Number((100 - successRatePercent).toFixed(2));

    return {
      sweepId,
      scenarioId: scenario.id,
      iterationsCount,
      successRatePercent,
      failureRatePercent,
      metricDistributions,
      iterations: Object.freeze(iterations),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Generates stochastic samples for defined parameters.
   */
  public static sampleParameters(
    stochasticParams: readonly StochasticParameter[],
    baseParams: Record<string, PropertyValue>,
    rng: () => number = Math.random
  ): Record<string, PropertyValue> {
    const sampled: Record<string, PropertyValue> = { ...baseParams };

    for (const param of stochasticParams) {
      sampled[param.name] = this.sampleValue(param, rng);
    }

    return sampled;
  }

  private static sampleValue(param: StochasticParameter, rng: () => number): PropertyValue {
    switch (param.distribution) {
      case 'uniform': {
        const min = param.params.min ?? 0;
        const max = param.params.max ?? 1;
        return min + rng() * (max - min);
      }
      case 'gaussian': {
        // Box-Muller transform for standard normal distribution
        const u1 = Math.max(1e-10, rng());
        const u2 = rng();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const mean = param.params.mean ?? 0;
        const stdDev = param.params.stdDev ?? 1;
        return mean + z0 * stdDev;
      }
      case 'poisson': {
        // Knuth's algorithm for Poisson distribution
        const lambda = param.params.lambda ?? 1;
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        do {
          k++;
          p *= rng();
        } while (p > L);
        return k - 1;
      }
      case 'exponential': {
        const lambda = param.params.lambda ?? 1;
        return -Math.log(1 - rng()) / lambda;
      }
      case 'choice': {
        const choices = param.params.choices ?? [];
        if (choices.length === 0) return null;
        const idx = Math.floor(rng() * choices.length);
        return choices[idx] ?? null;
      }
      default:
        return 0;
    }
  }

  public static computeDistributionStats(metricName: string, samples: number[]): MetricDistributionStats {
    if (samples.length === 0) {
      return {
        metricName,
        sampleCount: 0,
        min: 0,
        max: 0,
        mean: 0,
        stdDev: 0,
        variance: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;
    const min = sorted[0]!;
    const max = sorted[n - 1]!;

    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    const varianceSum = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const variance = varianceSum / n;
    const stdDev = Math.sqrt(variance);

    const p50 = this.getPercentile(sorted, 50);
    const p90 = this.getPercentile(sorted, 90);
    const p95 = this.getPercentile(sorted, 95);
    const p99 = this.getPercentile(sorted, 99);

    return {
      metricName,
      sampleCount: n,
      min: Number(min.toFixed(4)),
      max: Number(max.toFixed(4)),
      mean: Number(mean.toFixed(4)),
      stdDev: Number(stdDev.toFixed(4)),
      variance: Number(variance.toFixed(4)),
      p50: Number(p50.toFixed(4)),
      p90: Number(p90.toFixed(4)),
      p95: Number(p95.toFixed(4)),
      p99: Number(p99.toFixed(4)),
    };
  }

  private static getPercentile(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sorted[lower]!;
    return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
  }
}
