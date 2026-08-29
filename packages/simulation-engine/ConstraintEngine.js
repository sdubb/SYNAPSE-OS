/**
 * @file ConstraintEngine.ts
 * @description Evaluates whether simulation steps violate safety policies, SLA operational boundaries, rate limits, or structural invariants.
 */
export class ConstraintEngine {
    _safetyBoundaries = [];
    registerSafetyBoundary(boundary) {
        this._safetyBoundaries.push(boundary);
        return this;
    }
    /**
     * Evaluates both model-level constraints and operational safety boundaries.
     */
    evaluate(model, virtualTimestamp = Date.now()) {
        // 1. Evaluate native WorldModel constraints
        const modelValidation = model.validate();
        const modelViolations = [
            ...modelValidation.errors,
            ...modelValidation.warnings,
        ];
        // 2. Evaluate operational safety boundaries
        const boundaryViolations = [];
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
    static createMaxLatencyBoundary(id = 'boundary_max_latency', maxLatencyMs = 2000, severity = 'critical') {
        return {
            id,
            name: 'Max Service Latency SLA',
            propertyKey: 'latencyMs',
            maxAllowed: maxLatencyMs,
            severity,
        };
    }
    static createMaxErrorRateBoundary(id = 'boundary_max_error_rate', maxErrorPercent = 5.0, severity = 'critical') {
        return {
            id,
            name: 'Max Error Rate SLA',
            propertyKey: 'errorRate',
            maxAllowed: maxErrorPercent,
            severity,
        };
    }
}
//# sourceMappingURL=ConstraintEngine.js.map