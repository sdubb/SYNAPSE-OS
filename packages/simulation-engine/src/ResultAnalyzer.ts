/**
 * @file ResultAnalyzer.ts
 * @description Analyzes simulation outcomes, evaluates KPI targets, calculates risk indexes, MTTR, and failure severity distributions.
 */

import type { WorldModel } from '@synapse/world-engine';
import type { KPITarget, Scenario } from './Scenario.js';
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
  readonly safetyRiskScore: number; // 0.0 to 100.0
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  readonly recommendations: readonly string[];
}

export class ResultAnalyzer {
  /**
   * Evaluates final world state against scenario KPIs and safety constraint logs.
   */
  public static analyzeRun(params: {
    runId: string;
    scenario: Scenario;
    finalModel: WorldModel;
    stepReports: readonly ConstraintEvaluationReport[];
    executionRealMs: number;
  }): SimulationOutcomeReport {
    const kpiResults: KPIEvaluationResult[] = [];

    for (const kpi of params.scenario.kpis) {
      const actualVal = this.extractKPIValue(kpi, params.finalModel);
      const evalResult = this.evaluateKPI(kpi, actualVal);
      kpiResults.push(evalResult);
    }

    const allKPIsPassed = kpiResults.every((k) => k.passed);

    // Calculate total safety violations across all simulation steps
    let totalViolations = 0;
    let criticalViolations = 0;
    let errorViolations = 0;

    for (const report of params.stepReports) {
      totalViolations += report.totalViolationsCount;
      criticalViolations += report.safetyBoundaryViolations.filter((v) => v.severity === 'critical').length;
      errorViolations += report.safetyBoundaryViolations.filter((v) => v.severity === 'error').length;
    }

    // Safety Risk Score (0 = completely safe, 100 = extreme hazard)
    let rawRisk = 0;
    rawRisk += criticalViolations * 35;
    rawRisk += errorViolations * 15;
    rawRisk += (totalViolations - criticalViolations - errorViolations) * 5;
    if (!allKPIsPassed) rawRisk += 25;

    const safetyRiskScore = Math.min(100, Math.max(0, rawRisk));

    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (safetyRiskScore >= 75) riskLevel = 'critical';
    else if (safetyRiskScore >= 45) riskLevel = 'high';
    else if (safetyRiskScore >= 20) riskLevel = 'moderate';

    // Generate automated mitigation recommendations
    const recommendations: string[] = [];
    if (!allKPIsPassed) {
      const failedKPIs = kpiResults.filter((k) => !k.passed).map((k) => k.kpiName);
      recommendations.push(`Scenario failed target KPI(s): ${failedKPIs.join(', ')}`);
    }
    if (criticalViolations > 0) {
      recommendations.push(`Encountered ${criticalViolations} critical safety boundary breaches. Do not proceed to production execution without mitigation.`);
    }
    if (safetyRiskScore === 0) {
      recommendations.push('Scenario executed cleanly with zero safety breaches and all KPI targets met.');
    }

    return {
      runId: params.runId,
      scenarioId: params.scenario.id,
      durationVirtualMs: params.scenario.durationMs,
      executionRealMs: params.executionRealMs,
      totalSteps: params.stepReports.length,
      kpiResults: Object.freeze(kpiResults),
      allKPIsPassed,
      constraintViolationsCount: totalViolations,
      safetyRiskScore,
      riskLevel,
      recommendations: Object.freeze(recommendations),
    };
  }

  private static extractKPIValue(kpi: KPITarget, model: WorldModel): number | undefined {
    if (kpi.entityId) {
      const entity = model.getEntity(kpi.entityId);
      const val = entity?.state.get(kpi.propertyKey);
      return typeof val === 'number' ? val : undefined;
    }

    // If no specific entity specified, aggregate across all matching entities
    const matchingEntities = model.getAllEntities();
    const numericVals: number[] = [];

    for (const e of matchingEntities) {
      const val = e.state.get(kpi.propertyKey);
      if (typeof val === 'number') {
        numericVals.push(val);
      }
    }

    if (numericVals.length === 0) return undefined;
    // Return average
    return numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
  }

  private static evaluateKPI(kpi: KPITarget, actualValue?: number): KPIEvaluationResult {
    if (actualValue === undefined) {
      return {
        kpiId: kpi.id,
        kpiName: kpi.name,
        targetCondition: kpi.targetCondition,
        targetValues: kpi.targetValues,
        actualValue: undefined,
        passed: false,
        margin: -Infinity,
      };
    }

    let passed = false;
    let margin = 0;

    switch (kpi.targetCondition) {
      case 'greater_than': {
        const threshold = kpi.targetValues[0] ?? 0;
        passed = actualValue > threshold;
        margin = actualValue - threshold;
        break;
      }
      case 'less_than': {
        const threshold = kpi.targetValues[0] ?? 0;
        passed = actualValue < threshold;
        margin = threshold - actualValue;
        break;
      }
      case 'equals': {
        const target = kpi.targetValues[0] ?? 0;
        passed = Math.abs(actualValue - target) < 1e-6;
        margin = -Math.abs(actualValue - target);
        break;
      }
      case 'between': {
        const low = kpi.targetValues[0] ?? 0;
        const high = kpi.targetValues[1] ?? low;
        passed = actualValue >= low && actualValue <= high;
        margin = passed ? Math.min(actualValue - low, high - actualValue) : -1;
        break;
      }
    }

    return {
      kpiId: kpi.id,
      kpiName: kpi.name,
      targetCondition: kpi.targetCondition,
      targetValues: kpi.targetValues,
      actualValue,
      passed,
      margin: Number(margin.toFixed(4)),
    };
  }
}
