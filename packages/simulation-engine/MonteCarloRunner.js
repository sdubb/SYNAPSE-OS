/**
 * @file MonteCarloRunner.ts
 * @description Executes stochastic parameter variation sweeps and computes statistical distributions, percentiles, and risk probabilities.
 */
export class MonteCarloRunner {
    /**
     * Executes a Monte Carlo simulation sweep over stochastic parameters.
     */
    static async runSweep(scenario, iterationsCount, runSingleIteration) {
        const startTime = Date.now();
        const sweepId = `sweep_${scenario.id}_${Date.now()}`;
        const iterations = [];
        const metricSamples = {};
        for (let i = 0; i < iterationsCount; i++) {
            const sampledParams = this.sampleParameters(scenario.stochasticParameters, scenario.parameters);
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
                metricSamples[metricKey].push(val);
            }
        }
        // Compute distribution statistics for all tracked metrics
        const metricDistributions = {};
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
    static sampleParameters(stochasticParams, baseParams) {
        const sampled = { ...baseParams };
        for (const param of stochasticParams) {
            sampled[param.name] = this.sampleValue(param);
        }
        return sampled;
    }
    static sampleValue(param) {
        switch (param.distribution) {
            case 'uniform': {
                const min = param.params.min ?? 0;
                const max = param.params.max ?? 1;
                return min + Math.random() * (max - min);
            }
            case 'gaussian': {
                // Box-Muller transform for standard normal distribution
                const u1 = Math.max(1e-10, Math.random());
                const u2 = Math.random();
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
                    p *= Math.random();
                } while (p > L);
                return k - 1;
            }
            case 'exponential': {
                const lambda = param.params.lambda ?? 1;
                return -Math.log(1 - Math.random()) / lambda;
            }
            case 'choice': {
                const choices = param.params.choices ?? [];
                if (choices.length === 0)
                    return null;
                const idx = Math.floor(Math.random() * choices.length);
                return choices[idx] ?? null;
            }
            default:
                return 0;
        }
    }
    static computeDistributionStats(metricName, samples) {
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
        const min = sorted[0];
        const max = sorted[n - 1];
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
    static getPercentile(sorted, percentile) {
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (lower === upper)
            return sorted[lower];
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
}
//# sourceMappingURL=MonteCarloRunner.js.map