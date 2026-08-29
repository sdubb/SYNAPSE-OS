import { z } from "zod";

export const SimulationStatusSchema = z.enum(["draft", "running", "paused", "completed", "failed", "aborted"]);
export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;

export const SimulationClockTickSchema = z.object({
  tickIndex: z.number().int().nonnegative(),
  virtualTimeMs: z.number().int().nonnegative(),
  realTimestamp: z.number().int(),
  eventsDispatched: z.number().int().nonnegative().default(0),
  stateMutations: z.number().int().nonnegative().default(0),
});
export type SimulationClockTick = z.infer<typeof SimulationClockTickSchema>;

export const StateDiffOperationSchema = z.enum(["ADD", "UPDATE", "REMOVE"]);
export type StateDiffOperation = z.infer<typeof StateDiffOperationSchema>;

export const StateDiffEntrySchema = z.object({
  entityId: z.string().uuid(),
  operation: StateDiffOperationSchema,
  property: z.string(),
  beforeValue: z.unknown().optional(),
  afterValue: z.unknown().optional(),
});
export type StateDiffEntry = z.infer<typeof StateDiffEntrySchema>;

export const SimulationStateDiffSchema = z.object({
  tickIndex: z.number().int().nonnegative(),
  virtualTimeMs: z.number().int().nonnegative(),
  diffs: z.array(StateDiffEntrySchema),
  diffSummary: z.string().optional(),
});
export type SimulationStateDiff = z.infer<typeof SimulationStateDiffSchema>;

export const ScenarioActionSchema = z.object({
  id: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  actionType: z.string(),
  parameters: z.record(z.string(), z.unknown()).default({}),
  scheduledVirtualTimeMs: z.number().int().nonnegative(),
});
export type ScenarioAction = z.infer<typeof ScenarioActionSchema>;

export const SimulationScenarioSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  worldModelId: z.string().uuid(),
  name: z.string().min(1).max(256),
  description: z.string().max(2048).optional(),
  baseSnapshotId: z.string().uuid().optional(),
  actions: z.array(ScenarioActionSchema).default([]),
  durationVirtualMs: z.number().int().positive().default(3600000), // 1 virtual hour
  tickIntervalMs: z.number().int().positive().default(1000), // 1 virtual second per tick
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;

export const ComparativeMetricSchema = z.object({
  metricName: z.string(),
  baselineValue: z.number(),
  simulatedValue: z.number(),
  delta: z.number(),
  percentageChange: z.number(),
  unit: z.string().optional(),
});
export type ComparativeMetric = z.infer<typeof ComparativeMetricSchema>;

export const SimulationComparativeResultSchema = z.object({
  simulationRunId: z.string().uuid(),
  baselineRunId: z.string().uuid().optional(),
  metrics: z.array(ComparativeMetricSchema),
  riskScoreDelta: z.number(),
  criticalViolations: z.array(z.string()).default([]),
  summary: z.string(),
  recommendation: z.enum(["PROCEED", "REVISE", "ABORT"]),
});
export type SimulationComparativeResult = z.infer<typeof SimulationComparativeResultSchema>;

export const SimulationRunSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  worldModelId: z.string().uuid(),
  status: SimulationStatusSchema.default("draft"),
  currentTick: z.number().int().nonnegative().default(0),
  currentVirtualTimeMs: z.number().int().nonnegative().default(0),
  diffHistory: z.array(SimulationStateDiffSchema).default([]),
  comparativeResult: SimulationComparativeResultSchema.optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type SimulationRun = z.infer<typeof SimulationRunSchema>;
