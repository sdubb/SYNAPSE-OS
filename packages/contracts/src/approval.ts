import { z } from "zod";
import { PolicyRiskLevelSchema } from "./policy.js";

export const ApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "timed_out",
  "auto_approved",
  "cancelled",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "TIMED_OUT",
  "AUTO_APPROVED",
  "CANCELLED",
]);
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "timed_out"
  | "auto_approved"
  | "cancelled"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "TIMED_OUT"
  | "AUTO_APPROVED"
  | "CANCELLED";

export const ApprovalDecisionTypeSchema = z.enum(["APPROVED", "REJECTED", "approved", "rejected"]);
export type ApprovalDecisionType = "APPROVED" | "REJECTED" | "approved" | "rejected";

export const ToolApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  missionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  runId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
  runtimeId: z.string().uuid().optional(),
  clineSessionId: z.string().min(1),
  callId: z.string().min(1),
  toolName: z.string().min(1),
  toolParameters: z.record(z.string(), z.unknown()).default({}),
  riskLevel: PolicyRiskLevelSchema.default("MEDIUM"),
  policyDecision: z.string().optional(),
  safetyDecision: z.string().optional(),
  reason: z.string().optional(),
  status: ApprovalStatusSchema.default("pending"),
  timeoutSeconds: z.number().int().positive().default(300),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  resolvedAt: z.string().datetime().optional(),
  decisionBy: z.string().optional(),
  decisionAt: z.string().datetime().optional(),
});
export type ToolApprovalRequest = z.infer<typeof ToolApprovalRequestSchema>;

export const ApprovalDecisionSchema = z.object({
  requestId: z.string().uuid(),
  tenantId: z.string().uuid(),
  decision: ApprovalDecisionTypeSchema,
  decidedByUserId: z.string().uuid().optional(),
  decidedByRole: z.string().optional(),
  reason: z.string().max(1024).optional(),
  modifiedParameters: z.record(z.string(), z.unknown()).optional(),
  decidedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalResolutionSchema = z.object({
  requestId: z.string().uuid(),
  status: ApprovalStatusSchema,
  decision: ApprovalDecisionSchema.optional(),
  approvedParameters: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().optional(),
  resolvedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type ApprovalResolution = z.infer<typeof ApprovalResolutionSchema>;

export const CreateApprovalRequestSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  agentId: z.string().uuid(),
  missionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  runId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  runtimeId: z.string().uuid().optional(),
  clineSessionId: z.string().min(1),
  callId: z.string().min(1),
  toolName: z.string().min(1),
  toolParameters: z.record(z.string(), z.unknown()).default({}),
  riskLevel: PolicyRiskLevelSchema.default("MEDIUM"),
  policyDecision: z.string().optional(),
  safetyDecision: z.string().optional(),
  reason: z.string().optional(),
  timeoutSeconds: z.number().int().positive().default(300),
});
export type CreateApprovalRequest = z.infer<typeof CreateApprovalRequestSchema>;
