import { z } from "zod";
export declare const SimulationStatusSchema: z.ZodEnum<["draft", "running", "paused", "completed", "failed", "aborted"]>;
export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;
export declare const SimulationClockTickSchema: z.ZodObject<{
    tickIndex: z.ZodNumber;
    virtualTimeMs: z.ZodNumber;
    realTimestamp: z.ZodNumber;
    eventsDispatched: z.ZodDefault<z.ZodNumber>;
    stateMutations: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tickIndex: number;
    virtualTimeMs: number;
    realTimestamp: number;
    eventsDispatched: number;
    stateMutations: number;
}, {
    tickIndex: number;
    virtualTimeMs: number;
    realTimestamp: number;
    eventsDispatched?: number | undefined;
    stateMutations?: number | undefined;
}>;
export type SimulationClockTick = z.infer<typeof SimulationClockTickSchema>;
export declare const StateDiffOperationSchema: z.ZodEnum<["ADD", "UPDATE", "REMOVE"]>;
export type StateDiffOperation = z.infer<typeof StateDiffOperationSchema>;
export declare const StateDiffEntrySchema: z.ZodObject<{
    entityId: z.ZodString;
    operation: z.ZodEnum<["ADD", "UPDATE", "REMOVE"]>;
    property: z.ZodString;
    beforeValue: z.ZodOptional<z.ZodUnknown>;
    afterValue: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    entityId: string;
    operation: "ADD" | "UPDATE" | "REMOVE";
    property: string;
    beforeValue?: unknown;
    afterValue?: unknown;
}, {
    entityId: string;
    operation: "ADD" | "UPDATE" | "REMOVE";
    property: string;
    beforeValue?: unknown;
    afterValue?: unknown;
}>;
export type StateDiffEntry = z.infer<typeof StateDiffEntrySchema>;
export declare const SimulationStateDiffSchema: z.ZodObject<{
    tickIndex: z.ZodNumber;
    virtualTimeMs: z.ZodNumber;
    diffs: z.ZodArray<z.ZodObject<{
        entityId: z.ZodString;
        operation: z.ZodEnum<["ADD", "UPDATE", "REMOVE"]>;
        property: z.ZodString;
        beforeValue: z.ZodOptional<z.ZodUnknown>;
        afterValue: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        entityId: string;
        operation: "ADD" | "UPDATE" | "REMOVE";
        property: string;
        beforeValue?: unknown;
        afterValue?: unknown;
    }, {
        entityId: string;
        operation: "ADD" | "UPDATE" | "REMOVE";
        property: string;
        beforeValue?: unknown;
        afterValue?: unknown;
    }>, "many">;
    diffSummary: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tickIndex: number;
    virtualTimeMs: number;
    diffs: {
        entityId: string;
        operation: "ADD" | "UPDATE" | "REMOVE";
        property: string;
        beforeValue?: unknown;
        afterValue?: unknown;
    }[];
    diffSummary?: string | undefined;
}, {
    tickIndex: number;
    virtualTimeMs: number;
    diffs: {
        entityId: string;
        operation: "ADD" | "UPDATE" | "REMOVE";
        property: string;
        beforeValue?: unknown;
        afterValue?: unknown;
    }[];
    diffSummary?: string | undefined;
}>;
export type SimulationStateDiff = z.infer<typeof SimulationStateDiffSchema>;
export declare const ScenarioActionSchema: z.ZodObject<{
    id: z.ZodString;
    targetEntityId: z.ZodString;
    actionType: z.ZodString;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    scheduledVirtualTimeMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    parameters: Record<string, unknown>;
    id: string;
    targetEntityId: string;
    actionType: string;
    scheduledVirtualTimeMs: number;
}, {
    id: string;
    targetEntityId: string;
    actionType: string;
    scheduledVirtualTimeMs: number;
    parameters?: Record<string, unknown> | undefined;
}>;
export type ScenarioAction = z.infer<typeof ScenarioActionSchema>;
export declare const SimulationScenarioSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    worldModelId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    baseSnapshotId: z.ZodOptional<z.ZodString>;
    actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetEntityId: z.ZodString;
        actionType: z.ZodString;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        scheduledVirtualTimeMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        parameters: Record<string, unknown>;
        id: string;
        targetEntityId: string;
        actionType: string;
        scheduledVirtualTimeMs: number;
    }, {
        id: string;
        targetEntityId: string;
        actionType: string;
        scheduledVirtualTimeMs: number;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    durationVirtualMs: z.ZodDefault<z.ZodNumber>;
    tickIntervalMs: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    tenantId: string;
    createdAt: string;
    worldModelId: string;
    actions: {
        parameters: Record<string, unknown>;
        id: string;
        targetEntityId: string;
        actionType: string;
        scheduledVirtualTimeMs: number;
    }[];
    durationVirtualMs: number;
    tickIntervalMs: number;
    description?: string | undefined;
    baseSnapshotId?: string | undefined;
}, {
    name: string;
    id: string;
    tenantId: string;
    worldModelId: string;
    description?: string | undefined;
    createdAt?: string | undefined;
    baseSnapshotId?: string | undefined;
    actions?: {
        id: string;
        targetEntityId: string;
        actionType: string;
        scheduledVirtualTimeMs: number;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    durationVirtualMs?: number | undefined;
    tickIntervalMs?: number | undefined;
}>;
export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;
export declare const ComparativeMetricSchema: z.ZodObject<{
    metricName: z.ZodString;
    baselineValue: z.ZodNumber;
    simulatedValue: z.ZodNumber;
    delta: z.ZodNumber;
    percentageChange: z.ZodNumber;
    unit: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    metricName: string;
    baselineValue: number;
    simulatedValue: number;
    delta: number;
    percentageChange: number;
    unit?: string | undefined;
}, {
    metricName: string;
    baselineValue: number;
    simulatedValue: number;
    delta: number;
    percentageChange: number;
    unit?: string | undefined;
}>;
export type ComparativeMetric = z.infer<typeof ComparativeMetricSchema>;
export declare const SimulationComparativeResultSchema: z.ZodObject<{
    simulationRunId: z.ZodString;
    baselineRunId: z.ZodOptional<z.ZodString>;
    metrics: z.ZodArray<z.ZodObject<{
        metricName: z.ZodString;
        baselineValue: z.ZodNumber;
        simulatedValue: z.ZodNumber;
        delta: z.ZodNumber;
        percentageChange: z.ZodNumber;
        unit: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        metricName: string;
        baselineValue: number;
        simulatedValue: number;
        delta: number;
        percentageChange: number;
        unit?: string | undefined;
    }, {
        metricName: string;
        baselineValue: number;
        simulatedValue: number;
        delta: number;
        percentageChange: number;
        unit?: string | undefined;
    }>, "many">;
    riskScoreDelta: z.ZodNumber;
    criticalViolations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    summary: z.ZodString;
    recommendation: z.ZodEnum<["PROCEED", "REVISE", "ABORT"]>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    simulationRunId: string;
    metrics: {
        metricName: string;
        baselineValue: number;
        simulatedValue: number;
        delta: number;
        percentageChange: number;
        unit?: string | undefined;
    }[];
    riskScoreDelta: number;
    criticalViolations: string[];
    recommendation: "PROCEED" | "REVISE" | "ABORT";
    baselineRunId?: string | undefined;
}, {
    summary: string;
    simulationRunId: string;
    metrics: {
        metricName: string;
        baselineValue: number;
        simulatedValue: number;
        delta: number;
        percentageChange: number;
        unit?: string | undefined;
    }[];
    riskScoreDelta: number;
    recommendation: "PROCEED" | "REVISE" | "ABORT";
    baselineRunId?: string | undefined;
    criticalViolations?: string[] | undefined;
}>;
export type SimulationComparativeResult = z.infer<typeof SimulationComparativeResultSchema>;
export declare const SimulationRunSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    scenarioId: z.ZodString;
    worldModelId: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["draft", "running", "paused", "completed", "failed", "aborted"]>>;
    currentTick: z.ZodDefault<z.ZodNumber>;
    currentVirtualTimeMs: z.ZodDefault<z.ZodNumber>;
    diffHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        tickIndex: z.ZodNumber;
        virtualTimeMs: z.ZodNumber;
        diffs: z.ZodArray<z.ZodObject<{
            entityId: z.ZodString;
            operation: z.ZodEnum<["ADD", "UPDATE", "REMOVE"]>;
            property: z.ZodString;
            beforeValue: z.ZodOptional<z.ZodUnknown>;
            afterValue: z.ZodOptional<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            entityId: string;
            operation: "ADD" | "UPDATE" | "REMOVE";
            property: string;
            beforeValue?: unknown;
            afterValue?: unknown;
        }, {
            entityId: string;
            operation: "ADD" | "UPDATE" | "REMOVE";
            property: string;
            beforeValue?: unknown;
            afterValue?: unknown;
        }>, "many">;
        diffSummary: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tickIndex: number;
        virtualTimeMs: number;
        diffs: {
            entityId: string;
            operation: "ADD" | "UPDATE" | "REMOVE";
            property: string;
            beforeValue?: unknown;
            afterValue?: unknown;
        }[];
        diffSummary?: string | undefined;
    }, {
        tickIndex: number;
        virtualTimeMs: number;
        diffs: {
            entityId: string;
            operation: "ADD" | "UPDATE" | "REMOVE";
            property: string;
            beforeValue?: unknown;
            afterValue?: unknown;
        }[];
        diffSummary?: string | undefined;
    }>, "many">>;
    comparativeResult: z.ZodOptional<z.ZodObject<{
        simulationRunId: z.ZodString;
        baselineRunId: z.ZodOptional<z.ZodString>;
        metrics: z.ZodArray<z.ZodObject<{
            metricName: z.ZodString;
            baselineValue: z.ZodNumber;
            simulatedValue: z.ZodNumber;
            delta: z.ZodNumber;
            percentageChange: z.ZodNumber;
            unit: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            metricName: string;
            baselineValue: number;
            simulatedValue: number;
            delta: number;
            percentageChange: number;
            unit?: string | undefined;
        }, {
            metricName: string;
            baselineValue: number;
            simulatedValue: number;
            delta: number;
            percentageChange: number;
            unit?: string | undefined;
        }>, "many">;
        riskScoreDelta: z.ZodNumber;
        criticalViolations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        summary: z.ZodString;
        recommendation: z.ZodEnum<["PROCEED", "REVISE", "ABORT"]>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        simulationRunId: string;
        metrics: {
            metricName: string;
            baselineValue: number;
            simulatedValue: number;
            delta: number;
            percentageChange: number;
            unit?: string | undefined;
        }[];
        riskScoreDelta: number;
        criticalViolations: string[];
        recommendation: "PROCEED" | "REVISE" | "ABORT";
        baselineRunId?: string | undefined;
    }, {
        summary: string;
        simulationRunId: string;
        metrics: {
            metricName: string;
            baselineValue: number;
            simulatedValue: number;
            delta: number;
            percentageChange: number;
            unit?: string | undefined;
        }[];
        riskScoreDelta: number;
        recommendation: "PROCEED" | "REVISE" | "ABORT";
        baselineRunId?: string | undefined;
        criticalViolations?: string[] | undefined;
    }>>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "aborted" | "running" | "paused" | "completed" | "failed" | "draft";
    id: string;
    tenantId: string;
    createdAt: string;
    worldModelId: string;
    scenarioId: string;
    currentTick: number;
    currentVirtualTimeMs: number;
    diffHistory: {
        tickIndex: number;
        virtualTimeMs: number;
        diffs: {
            entityId: string;
            operation: "ADD" | "UPDATE" | "REMOVE";
            property: string;
            beforeValue?: unknown;
            afterValue?: unknown;
        }[];
        diffSummary?: string | undefined;
    }[];
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    comparativeResult?: {
        summary: string;
        simulationRunId: string;
        metrics: {
            metricName: string;
            baselineValue: number;
            simulatedValue: number;
            delta: number;
            percentageChange: number;
            unit?: string | undefined;
        }[];
        riskScoreDelta: number;
        criticalViolations: string[];
        recommendation: "PROCEED" | "REVISE" | "ABORT";
        baselineRunId?: string | undefined;
    } | undefined;
}, {
    id: string;
    tenantId: string;
    worldModelId: string;
    scenarioId: string;
    status?: "aborted" | "running" | "paused" | "completed" | "failed" | "draft" | undefined;
    createdAt?: string | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    currentTick?: number | undefined;
    currentVirtualTimeMs?: number | undefined;
    diffHistory?: {
        tickIndex: number;
        virtualTimeMs: number;
        diffs: {
            entityId: string;
            operation: "ADD" | "UPDATE" | "REMOVE";
            property: string;
            beforeValue?: unknown;
            afterValue?: unknown;
        }[];
        diffSummary?: string | undefined;
    }[] | undefined;
    comparativeResult?: {
        summary: string;
        simulationRunId: string;
        metrics: {
            metricName: string;
            baselineValue: number;
            simulatedValue: number;
            delta: number;
            percentageChange: number;
            unit?: string | undefined;
        }[];
        riskScoreDelta: number;
        recommendation: "PROCEED" | "REVISE" | "ABORT";
        baselineRunId?: string | undefined;
        criticalViolations?: string[] | undefined;
    } | undefined;
}>;
export type SimulationRun = z.infer<typeof SimulationRunSchema>;
//# sourceMappingURL=simulation.d.ts.map