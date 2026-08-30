import { z } from "zod";

export const SynapseEventTypeSchema = z.enum([
  // Mission & Graph Lifecycle
  "mission.created",
  "mission.updated",
  "mission.status_changed",
  "graph.updated",
  "node.started",
  "node.completed",
  "node.failed",

  // Agent Lifecycle
  "agent.created",
  "agent.updated",
  "agent.deleted",
  "agent.status_changed",
  "agent.started",
  "agent.paused",
  "agent.resumed",
  "agent.stopped",
  "agent.aborted",
  "agent.completed",
  "agent.failed",
  "cline.status_changed",

  // Stream & Message Semantics
  "stream.delta",
  "message.started",
  "message.created",
  "message.completed",

  // Session Lifecycle
  "session.initialized",
  "session.started",
  "session.updated",
  "session.chunk",
  "session.message",
  "session.thought",
  "session.paused",
  "session.resumed",
  "session.checkpoint_created",
  "session.checkpoint_restored",
  "session.ended",

  // Task Lifecycle
  "task.created",
  "task.scheduled",
  "task.dispatched",
  "task.status_changed",
  "task.started",
  "task.completed",
  "task.failed",
  "task.retry",
  "task.cancelled",
  "task.blocked",

  // Run & Attempt Lifecycle
  "run.started",
  "run.paused",
  "run.resumed",
  "run.failed",
  "run.completed",
  "run.blocked",
  "attempt.started",
  "attempt.completed",
  "attempt.failed",

  // Tool & MCP Gateway
  "tool.requested",
  "tool.authorized",
  "tool.policy_checked",
  "tool.approval_required",
  "tool.approved",
  "tool.rejected",
  "tool.denied",
  "tool.blocked",
  "tool.started",
  "tool.executed",
  "tool.completed",
  "tool.failed",

  // Approval & Governance
  "approval.created",
  "approval.resolved",
  "policy.evaluated",
  "policy.allowed",
  "policy.blocked",
  "policy.violation",
  "governance.kill_switch_triggered",

  // Verification & Evidence
  "verification.plan_created",
  "verification.started",
  "verification.assertion_passed",
  "verification.assertion_failed",
  "verification.passed",
  "verification.failed",
  "verification.completed",
  "evidence.collected",
  "evidence.sealed",
  "observation.recorded",

  // Team & Collaboration
  "team.created",
  "team.member_joined",
  "team.member_left",
  "team.progress_updated",
  "team.delegation_started",
  "team.delegation_completed",

  // Workspace & File
  "workspace.provisioned",
  "workspace.modified",
  "workspace.locked",
  "workspace.unlocked",
  "workspace.snapshot_created",

  // World Model & Simulation
  "world.entity_mutated",
  "world.snapshot_captured",
  "simulation.started",
  "simulation.tick",
  "simulation.diff_generated",
  "simulation.completed",

  // System & Audit
  "audit.entry_recorded",
  "audit.recorded",
  "telemetry.metric_emitted",
  "system.heartbeat",
  "system.error",
]);
export type SynapseEventType = z.infer<typeof SynapseEventTypeSchema>;

export const SynapseEventSourceSchema = z.enum([
  "engine.cline",
  "engine.adapter",
  "control.plane",
  "tool.gateway",
  "api",
  "verifier",
  "simulator",
  "scheduler",
  "policy.engine",
  "safety.engine",
  "approval.engine",
  "realtime.hub",
  "backend",
  "worker",
  "worker.agent",
]);
export type SynapseEventSource = z.infer<typeof SynapseEventSourceSchema>;

export const SynapseEventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: SynapseEventTypeSchema,
  tenantId: z.string().uuid(),
  missionId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  runId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  runtimeId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  timestamp: z.number().int().positive().default(() => Date.now()),
  isoTimestamp: z.string().datetime().default(() => new Date().toISOString()),
  sequence: z.number().int().nonnegative(),
  source: SynapseEventSourceSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  traceId: z.string().min(1).default(() => crypto.randomUUID()),
  parentEventId: z.string().uuid().optional(),
});
export type SynapseEventEnvelope = z.infer<typeof SynapseEventEnvelopeSchema>;

export const CreateEventInputSchema = SynapseEventEnvelopeSchema.omit({
  eventId: true,
  timestamp: true,
  isoTimestamp: true,
  sequence: true,
  traceId: true,
}).extend({
  eventId: z.string().uuid().optional(),
  sequence: z.number().int().nonnegative().optional(),
  traceId: z.string().min(1).optional(),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
