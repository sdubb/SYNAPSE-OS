import { z } from "zod";
export const VerificationVerdictSchema = z.enum(["PASS", "FAIL", "INCONCLUSIVE", "SKIPPED"]);
export const AssertionTypeSchema = z.enum([
    "FILE_EXISTS",
    "FILE_CONTAINS",
    "FILE_EQUALS",
    "FILE_DOES_NOT_EXIST",
    "GIT_DIFF_EMPTY",
    "GIT_BRANCH_EXISTS",
    "GIT_COMMIT_PRESENT",
    "COMMAND_EXIT_ZERO",
    "COMMAND_OUTPUT_MATCHES",
    "TEST_SUITE_PASS",
    "BUILD_SUCCESS",
    "SECURITY_SCAN_CLEAN",
    "HTTP_STATUS_OK",
    "AGENT_EVALUATION",
]);
export const VerificationAssertionSchema = z.object({
    id: z.string().uuid(),
    type: AssertionTypeSchema,
    name: z.string().min(1).max(256),
    description: z.string().max(1024).optional(),
    target: z.string(), // file path, command string, url, branch name
    expectedValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.record(z.unknown())]).optional(),
    timeoutSeconds: z.number().int().positive().default(60),
    critical: z.boolean().default(true),
    metadata: z.record(z.unknown()).default({}),
});
export const AssertionResultSchema = z.object({
    assertionId: z.string().uuid(),
    assertionName: z.string(),
    type: AssertionTypeSchema,
    verdict: VerificationVerdictSchema,
    actualValue: z.unknown().optional(),
    errorMessage: z.string().optional(),
    executionTimeMs: z.number().int().nonnegative().default(0),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    evidenceId: z.string().uuid().optional(),
});
export const VerificationPlanSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    name: z.string().min(1).max(256),
    description: z.string().max(2048).optional(),
    assertions: z.array(VerificationAssertionSchema).default([]),
    requireVerifierAgent: z.boolean().default(false),
    verifierAgentPrompt: z.string().optional(),
    maxExecutionTimeMs: z.number().int().positive().default(300000), // 5 min
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
    updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export const VerificationRunSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    planId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    workspaceId: z.string().uuid().optional(),
    overallVerdict: VerificationVerdictSchema.default("INCONCLUSIVE"),
    assertionResults: z.array(AssertionResultSchema).default([]),
    summary: z.string().optional(),
    evidenceChainRootHash: z.string().optional(),
    startedAt: z.string().datetime().default(() => new Date().toISOString()),
    completedAt: z.string().datetime().optional(),
});
export const CreateVerificationPlanRequestSchema = VerificationPlanSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
//# sourceMappingURL=verification.js.map