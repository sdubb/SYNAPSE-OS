/**
 * @file ConstraintEngine.ts
 * @description Evaluates whether simulation steps violate safety policies, SLA operational boundaries, rate limits, or structural invariants.
 */

import type { WorldModel, ConstraintViolation } from '@synapse/world-engine';

export interface SafetyBoundary {
  readonly id: string;
  readonly name: string;
  readonly entityType?: string;
  readonly propertyKey: string;
  readonly minAllowed?: number;
  readonly maxAllowed?: number;
  readonly forbiddenValues?: readonly unknown[];
  readonly customCheck?: (model: WorldModel) => ConstraintViolation | null;
  readonly severity: 'warning' | 'error' | 'critical';
}

export interface ConstraintEvaluationReport {
  readonly isValid: boolean;
  readonly stepTime: number;
  readonly violations: readonly ConstraintViolation[];
  readonly safetyBoundaryViolations: readonly ConstraintViolation[];
  readonly totalViolationsCount: number;
}

export class ConstraintEngine {
  private readonly _safetyBoundaries: SafetyBoundary[] = [];

  public registerSafetyBoundary(boundary: SafetyBoundary): this {
    this._safetyBoundaries.push(boundary);
    return this;
  }

  /**
   * Evaluates both model-level constraints and operational safety boundaries.
   */
  public evaluate(model: WorldModel, virtualTimestamp = Date.now()): ConstraintEvaluationReport {
    // 1. Evaluate native WorldModel constraints
    const modelValidation = model.validate();
    const modelViolations: ConstraintViolation[] = [
      ...modelValidation.errors,
      ...modelValidation.warnings,
    ];

    // 2. Evaluate operational safety boundaries
    const boundaryViolations: ConstraintViolation[] = [];

    for (const boundary of this._safetyBoundaries) {
      if (boundary.customCheck) {
        const violation = boundary.customCheck(model);
        if (violation) {
          boundaryViolations.push(violation);
        }
        continue;
      }

      for (const entity of model.getAllEntities()) {
        if (boundary.entityType && entity.type !== boundary.entityType) {
          continue;
        }

        const val = entity.state.get(boundary.propertyKey);

        if (typeof val === 'number') {
          if (boundary.maxAllowed !== undefined && val > boundary.maxAllowed) {
            boundaryViolations.push({
              constraintId: boundary.id,
              constraintName: boundary.name,
              severity: boundary.severity,
              message: `Entity ${entity.id} exceeded max safe ${boundary.propertyKey}: ${val} > ${boundary.maxAllowed}`,
              targetId: entity.id,
              targetType: 'entity',
              details: { propertyKey: boundary.propertyKey, value: val, limit: boundary.maxAllowed },
              timestamp: virtualTimestamp,
            });
          }
          if (boundary.minAllowed !== undefined && val < boundary.minAllowed) {
            boundaryViolations.push({
              constraintId: boundary.id,
              constraintName: boundary.name,
              severity: boundary.severity,
              message: `Entity ${entity.id} fell below min safe ${boundary.propertyKey}: ${val} < ${boundary.minAllowed}`,
              targetId: entity.id,
              targetType: 'entity',
              details: { propertyKey: boundary.propertyKey, value: val, limit: boundary.minAllowed },
              timestamp: virtualTimestamp,
            });
          }
        }

        if (boundary.forbiddenValues && boundary.forbiddenValues.includes(val)) {
          boundaryViolations.push({
            constraintId: boundary.id,
            constraintName: boundary.name,
            severity: boundary.severity,
            message: `Entity ${entity.id} has forbidden value '${String(val)}' for ${boundary.propertyKey}`,
            targetId: entity.id,
            targetType: 'entity',
            details: { propertyKey: boundary.propertyKey, value: val },
            timestamp: virtualTimestamp,
          });
        }
      }
    }

    const allViolations = [...modelViolations, ...boundaryViolations];
    const hasFatal = allViolations.some((v) => v.severity === 'error' || v.severity === 'critical');

    return {
      isValid: !hasFatal,
      stepTime: virtualTimestamp,
      violations: Object.freeze(modelViolations),
      safetyBoundaryViolations: Object.freeze(boundaryViolations),
      totalViolationsCount: allViolations.length,
    };
  }

  public static createMaxLatencyBoundary(
    id = 'boundary_max_latency',
    maxLatencyMs = 2000,
    severity: 'warning' | 'error' | 'critical' = 'critical'
  ): SafetyBoundary {
    return {
      id,
      name: 'Max Service Latency SLA',
      propertyKey: 'latencyMs',
      maxAllowed: maxLatencyMs,
      severity,
    };
  }

  public static createMaxErrorRateBoundary(
    id = 'boundary_max_error_rate',
    maxErrorPercent = 5.0,
    severity: 'warning' | 'error' | 'critical' = 'critical'
  ): SafetyBoundary {
    return {
      id,
      name: 'Max Error Rate SLA',
      propertyKey: 'errorRate',
      maxAllowed: maxErrorPercent,
      severity,
    };
  }
}
