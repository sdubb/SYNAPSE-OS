import { z } from "zod";
import { PolicyRiskLevelSchema } from "./policy.js";
export const ApprovalStatusSchema = z.enum([
    "pending",
    "approved",
    "rejected",
    "timed_out",
    "auto_approved",
    "cancelled",
]);
export const ApprovalDecisionTypeSchema = z.enum(["APPROVED", "REJECTED"]);
export const ToolApprovalRequestSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    sessionId: z.string().uuid(),
    agentId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    workspaceId: z.string().uuid().optional(),
    clineSessionId: z.string().min(1),
    callId: z.string().min(1),
    toolName: z.string().min(1),
    toolParameters: z.record(z.unknown()).default({}),
    riskLevel: PolicyRiskLevelSchema.default("MEDIUM"),
    reason: z.string().optional(),
    status: ApprovalStatusSchema.default("pending"),
    timeoutSeconds: z.number().int().positive().default(300),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
    resolvedAt: z.string().datetime().optional(),
});
export const ApprovalDecisionSchema = z.object({
    requestId: z.string().uuid(),
    tenantId: z.string().uuid(),
    decision: ApprovalDecisionTypeSchema,
    decidedByUserId: z.string().uuid().optional(),
    decidedByRole: z.string().optional(),
    reason: z.string().max(1024).optional(),
    modifiedParameters: z.record(z.unknown()).optional(),
    decidedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const ApprovalResolutionSchema = z.object({
    requestId: z.string().uuid(),
    status: ApprovalStatusSchema,
    decision: ApprovalDecisionSchema.optional(),
    approvedParameters: z.record(z.unknown()).optional(),
    resolvedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const CreateApprovalRequestSchema = z.object({
    tenantId: z.string().uuid(),
    sessionId: z.string().uuid(),
    agentId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    workspaceId: z.string().uuid().optional(),
    clineSessionId: z.string().min(1),
    callId: z.string().min(1),
    toolName: z.string().min(1),
    toolParameters: z.record(z.unknown()).default({}),
    riskLevel: PolicyRiskLevelSchema.default("MEDIUM"),
    reason: z.string().optional(),
    timeoutSeconds: z.number().int().positive().default(300),
});
//# sourceMappingURL=approval.js.map