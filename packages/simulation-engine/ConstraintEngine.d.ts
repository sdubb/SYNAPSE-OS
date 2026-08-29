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
export declare class ConstraintEngine {
    private readonly _safetyBoundaries;
    registerSafetyBoundary(boundary: SafetyBoundary): this;
    /**
     * Evaluates both model-level constraints and operational safety boundaries.
     */
    evaluate(model: WorldModel, virtualTimestamp?: number): ConstraintEvaluationReport;
    static createMaxLatencyBoundary(id?: string, maxLatencyMs?: number, severity?: 'warning' | 'error' | 'critical'): SafetyBoundary;
    static createMaxErrorRateBoundary(id?: string, maxErrorPercent?: number, severity?: 'warning' | 'error' | 'critical'): SafetyBoundary;
}
//# sourceMappingURL=ConstraintEngine.d.ts.map