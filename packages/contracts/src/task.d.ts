import { z } from "zod";
export declare const TaskStatusSchema: z.ZodEnum<["backlog", "planned", "authorized", "queued", "running", "verifying", "review", "completed", "failed", "recovery", "retry", "cancelled"]>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export declare const TaskPrioritySchema: z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export declare const DependencyTypeSchema: z.ZodEnum<["blocks", "requires_success", "parallel_with", "after"]>;
export type DependencyType = z.infer<typeof DependencyTypeSchema>;
export declare const TaskDependencySchema: z.ZodObject<{
    taskId: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["blocks", "requires_success", "parallel_with", "after"]>>;
}, "strip", z.ZodTypeAny, {
    type: "blocks" | "requires_success" | "parallel_with" | "after";
    taskId: string;
}, {
    taskId: string;
    type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
}>;
export type TaskDependency = z.infer<typeof TaskDependencySchema>;
export declare const RetryPolicySchema: z.ZodObject<{
    maxRetries: z.ZodDefault<z.ZodNumber>;
    currentRetry: z.ZodDefault<z.ZodNumber>;
    backoffMs: z.ZodDefault<z.ZodNumber>;
    exponential: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    maxRetries: number;
    currentRetry: number;
    backoffMs: number;
    exponential: boolean;
}, {
    maxRetries?: number | undefined;
    currentRetry?: number | undefined;
    backoffMs?: number | undefined;
    exponential?: boolean | undefined;
}>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export declare const TaskExecutionResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    exitCode: z.ZodOptional<z.ZodNumber>;
    summary: z.ZodOptional<z.ZodString>;
    outputArtifacts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    errorMessage: z.ZodOptional<z.ZodString>;
    errorStack: z.ZodOptional<z.ZodString>;
    executionDurationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    outputArtifacts: string[];
    exitCode?: number | undefined;
    summary?: string | undefined;
    errorMessage?: string | undefined;
    errorStack?: string | undefined;
    executionDurationMs?: number | undefined;
}, {
    success: boolean;
    exitCode?: number | undefined;
    summary?: string | undefined;
    outputArtifacts?: string[] | undefined;
    errorMessage?: string | undefined;
    errorStack?: string | undefined;
    executionDurationMs?: number | undefined;
}>;
export type TaskExecutionResult = z.infer<typeof TaskExecutionResultSchema>;
/**
 * Mission: High-level team or multi-task objective
 */
export declare const MissionSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    teamId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    objective: z.ZodString;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "completed", "failed", "cancelled"]>>;
    taskIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    policies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    budgetUsd: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "paused" | "completed" | "failed" | "active" | "cancelled" | "draft";
    id: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    objective: string;
    context: Record<string, unknown>;
    constraints: string[];
    taskIds: string[];
    policies: string[];
    teamId?: string | undefined;
    budgetUsd?: number | undefined;
}, {
    id: string;
    tenantId: string;
    title: string;
    objective: string;
    status?: "paused" | "completed" | "failed" | "active" | "cancelled" | "draft" | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    teamId?: string | undefined;
    context?: Record<string, unknown> | undefined;
    constraints?: string[] | undefined;
    taskIds?: string[] | undefined;
    policies?: string[] | undefined;
    budgetUsd?: number | undefined;
}>;
export type Mission = z.infer<typeof MissionSchema>;
/**
 * Task Run: A single execution attempt of a task
 */
export declare const TaskRunSchema: z.ZodObject<{
    id: z.ZodString;
    taskId: z.ZodString;
    tenantId: z.ZodString;
    agentId: z.ZodString;
    clineSessionId: z.ZodOptional<z.ZodString>;
    runNumber: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["queued", "starting", "running", "waiting_approval", "paused", "recovering", "verifying", "completed", "failed", "cancelled", "terminated"]>>;
    startedAt: z.ZodDefault<z.ZodString>;
    endedAt: z.ZodOptional<z.ZodString>;
    tokenUsage: z.ZodDefault<z.ZodObject<{
        promptTokens: z.ZodDefault<z.ZodNumber>;
        completionTokens: z.ZodDefault<z.ZodNumber>;
        totalCostUsd: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalCostUsd: number;
    }, {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalCostUsd?: number | undefined;
    }>>;
    verificationId: z.ZodOptional<z.ZodString>;
    evidenceId: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "queued" | "running" | "paused" | "verifying" | "completed" | "failed" | "terminated" | "cancelled" | "starting" | "waiting_approval" | "recovering";
    id: string;
    tenantId: string;
    metadata: Record<string, unknown>;
    agentId: string;
    taskId: string;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalCostUsd: number;
    };
    startedAt: string;
    runNumber: number;
    clineSessionId?: string | undefined;
    endedAt?: string | undefined;
    verificationId?: string | undefined;
    evidenceId?: string | undefined;
    error?: string | undefined;
}, {
    id: string;
    tenantId: string;
    agentId: string;
    taskId: string;
    status?: "queued" | "running" | "paused" | "verifying" | "completed" | "failed" | "terminated" | "cancelled" | "starting" | "waiting_approval" | "recovering" | undefined;
    metadata?: Record<string, unknown> | undefined;
    clineSessionId?: string | undefined;
    tokenUsage?: {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalCostUsd?: number | undefined;
    } | undefined;
    startedAt?: string | undefined;
    endedAt?: string | undefined;
    runNumber?: number | undefined;
    verificationId?: string | undefined;
    evidenceId?: string | undefined;
    error?: string | undefined;
}>;
export type TaskRun = z.infer<typeof TaskRunSchema>;
/**
 * Universal Synapse Task Schema - open-ended, not locked to any domain.
 */
export declare const SynapseTaskSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    missionId: z.ZodOptional<z.ZodString>;
    parentTaskId: z.ZodOptional<z.ZodString>;
    workspaceId: z.ZodString;
    assignedAgentId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    objective: z.ZodDefault<z.ZodString>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    inputs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    expectedOutputs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    successCriteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    instructions: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["backlog", "planned", "authorized", "queued", "running", "verifying", "review", "completed", "failed", "recovery", "retry", "cancelled"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        taskId: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["blocks", "requires_success", "parallel_with", "after"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "blocks" | "requires_success" | "parallel_with" | "after";
        taskId: string;
    }, {
        taskId: string;
        type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
    }>, "many">>;
    policyIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    verificationPlanId: z.ZodOptional<z.ZodString>;
    retryPolicy: z.ZodDefault<z.ZodObject<{
        maxRetries: z.ZodDefault<z.ZodNumber>;
        currentRetry: z.ZodDefault<z.ZodNumber>;
        backoffMs: z.ZodDefault<z.ZodNumber>;
        exponential: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxRetries: number;
        currentRetry: number;
        backoffMs: number;
        exponential: boolean;
    }, {
        maxRetries?: number | undefined;
        currentRetry?: number | undefined;
        backoffMs?: number | undefined;
        exponential?: boolean | undefined;
    }>>;
    currentRunId: z.ZodOptional<z.ZodString>;
    executionResult: z.ZodOptional<z.ZodObject<{
        success: z.ZodBoolean;
        exitCode: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        outputArtifacts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        errorMessage: z.ZodOptional<z.ZodString>;
        errorStack: z.ZodOptional<z.ZodString>;
        executionDurationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        outputArtifacts: string[];
        exitCode?: number | undefined;
        summary?: string | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    }, {
        success: boolean;
        exitCode?: number | undefined;
        summary?: string | undefined;
        outputArtifacts?: string[] | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    }>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "queued" | "running" | "verifying" | "completed" | "failed" | "backlog" | "planned" | "authorized" | "review" | "recovery" | "retry" | "cancelled";
    id: string;
    tenantId: string;
    tags: string[];
    instructions: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    workspaceId: string;
    title: string;
    objective: string;
    context: Record<string, unknown>;
    constraints: string[];
    inputs: Record<string, unknown>;
    expectedOutputs: string[];
    successCriteria: string[];
    priority: "low" | "medium" | "high" | "critical" | "emergency";
    dependencies: {
        type: "blocks" | "requires_success" | "parallel_with" | "after";
        taskId: string;
    }[];
    policyIds: string[];
    retryPolicy: {
        maxRetries: number;
        currentRetry: number;
        backoffMs: number;
        exponential: boolean;
    };
    description?: string | undefined;
    startedAt?: string | undefined;
    teamId?: string | undefined;
    missionId?: string | undefined;
    parentTaskId?: string | undefined;
    assignedAgentId?: string | undefined;
    verificationPlanId?: string | undefined;
    currentRunId?: string | undefined;
    executionResult?: {
        success: boolean;
        outputArtifacts: string[];
        exitCode?: number | undefined;
        summary?: string | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    } | undefined;
    scheduledAt?: string | undefined;
    completedAt?: string | undefined;
}, {
    id: string;
    tenantId: string;
    instructions: string;
    workspaceId: string;
    title: string;
    status?: "queued" | "running" | "verifying" | "completed" | "failed" | "backlog" | "planned" | "authorized" | "review" | "recovery" | "retry" | "cancelled" | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    startedAt?: string | undefined;
    teamId?: string | undefined;
    objective?: string | undefined;
    context?: Record<string, unknown> | undefined;
    constraints?: string[] | undefined;
    missionId?: string | undefined;
    parentTaskId?: string | undefined;
    assignedAgentId?: string | undefined;
    inputs?: Record<string, unknown> | undefined;
    expectedOutputs?: string[] | undefined;
    successCriteria?: string[] | undefined;
    priority?: "low" | "medium" | "high" | "critical" | "emergency" | undefined;
    dependencies?: {
        taskId: string;
        type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
    }[] | undefined;
    policyIds?: string[] | undefined;
    verificationPlanId?: string | undefined;
    retryPolicy?: {
        maxRetries?: number | undefined;
        currentRetry?: number | undefined;
        backoffMs?: number | undefined;
        exponential?: boolean | undefined;
    } | undefined;
    currentRunId?: string | undefined;
    executionResult?: {
        success: boolean;
        exitCode?: number | undefined;
        summary?: string | undefined;
        outputArtifacts?: string[] | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    } | undefined;
    scheduledAt?: string | undefined;
    completedAt?: string | undefined;
}>;
export type SynapseTask = z.infer<typeof SynapseTaskSchema>;
export declare const CreateTaskRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    missionId: z.ZodOptional<z.ZodString>;
    parentTaskId: z.ZodOptional<z.ZodString>;
    workspaceId: z.ZodString;
    assignedAgentId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    objective: z.ZodOptional<z.ZodString>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    inputs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    expectedOutputs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    successCriteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    instructions: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        taskId: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["blocks", "requires_success", "parallel_with", "after"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "blocks" | "requires_success" | "parallel_with" | "after";
        taskId: string;
    }, {
        taskId: string;
        type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
    }>, "many">>;
    policyIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    verificationPlanId: z.ZodOptional<z.ZodString>;
    retryPolicy: z.ZodDefault<z.ZodObject<{
        maxRetries: z.ZodDefault<z.ZodNumber>;
        currentRetry: z.ZodDefault<z.ZodNumber>;
        backoffMs: z.ZodDefault<z.ZodNumber>;
        exponential: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxRetries: number;
        currentRetry: number;
        backoffMs: number;
        exponential: boolean;
    }, {
        maxRetries?: number | undefined;
        currentRetry?: number | undefined;
        backoffMs?: number | undefined;
        exponential?: boolean | undefined;
    }>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    tags: string[];
    instructions: string;
    metadata: Record<string, unknown>;
    workspaceId: string;
    title: string;
    context: Record<string, unknown>;
    constraints: string[];
    inputs: Record<string, unknown>;
    expectedOutputs: string[];
    successCriteria: string[];
    priority: "low" | "medium" | "high" | "critical" | "emergency";
    dependencies: {
        type: "blocks" | "requires_success" | "parallel_with" | "after";
        taskId: string;
    }[];
    policyIds: string[];
    retryPolicy: {
        maxRetries: number;
        currentRetry: number;
        backoffMs: number;
        exponential: boolean;
    };
    description?: string | undefined;
    teamId?: string | undefined;
    objective?: string | undefined;
    missionId?: string | undefined;
    parentTaskId?: string | undefined;
    assignedAgentId?: string | undefined;
    verificationPlanId?: string | undefined;
    scheduledAt?: string | undefined;
}, {
    tenantId: string;
    instructions: string;
    workspaceId: string;
    title: string;
    description?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    teamId?: string | undefined;
    objective?: string | undefined;
    context?: Record<string, unknown> | undefined;
    constraints?: string[] | undefined;
    missionId?: string | undefined;
    parentTaskId?: string | undefined;
    assignedAgentId?: string | undefined;
    inputs?: Record<string, unknown> | undefined;
    expectedOutputs?: string[] | undefined;
    successCriteria?: string[] | undefined;
    priority?: "low" | "medium" | "high" | "critical" | "emergency" | undefined;
    dependencies?: {
        taskId: string;
        type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
    }[] | undefined;
    policyIds?: string[] | undefined;
    verificationPlanId?: string | undefined;
    retryPolicy?: {
        maxRetries?: number | undefined;
        currentRetry?: number | undefined;
        backoffMs?: number | undefined;
        exponential?: boolean | undefined;
    } | undefined;
    scheduledAt?: string | undefined;
}>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export declare const UpdateTaskRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    objective: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    expectedOutputs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    successCriteria: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    instructions: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["backlog", "planned", "authorized", "queued", "running", "verifying", "review", "completed", "failed", "recovery", "retry", "cancelled"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>>;
    assignedAgentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dependencies: z.ZodOptional<z.ZodArray<z.ZodObject<{
        taskId: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["blocks", "requires_success", "parallel_with", "after"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "blocks" | "requires_success" | "parallel_with" | "after";
        taskId: string;
    }, {
        taskId: string;
        type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
    }>, "many">>;
    verificationPlanId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    executionResult: z.ZodOptional<z.ZodObject<{
        success: z.ZodBoolean;
        exitCode: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        outputArtifacts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        errorMessage: z.ZodOptional<z.ZodString>;
        errorStack: z.ZodOptional<z.ZodString>;
        executionDurationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        outputArtifacts: string[];
        exitCode?: number | undefined;
        summary?: string | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    }, {
        success: boolean;
        exitCode?: number | undefined;
        summary?: string | undefined;
        outputArtifacts?: string[] | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "queued" | "running" | "verifying" | "completed" | "failed" | "backlog" | "planned" | "authorized" | "review" | "recovery" | "retry" | "cancelled" | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    instructions?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    title?: string | undefined;
    startedAt?: string | undefined;
    objective?: string | undefined;
    context?: Record<string, unknown> | undefined;
    constraints?: string[] | undefined;
    assignedAgentId?: string | null | undefined;
    inputs?: Record<string, unknown> | undefined;
    expectedOutputs?: string[] | undefined;
    successCriteria?: string[] | undefined;
    priority?: "low" | "medium" | "high" | "critical" | "emergency" | undefined;
    dependencies?: {
        type: "blocks" | "requires_success" | "parallel_with" | "after";
        taskId: string;
    }[] | undefined;
    verificationPlanId?: string | null | undefined;
    executionResult?: {
        success: boolean;
        outputArtifacts: string[];
        exitCode?: number | undefined;
        summary?: string | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    } | undefined;
    completedAt?: string | undefined;
}, {
    status?: "queued" | "running" | "verifying" | "completed" | "failed" | "backlog" | "planned" | "authorized" | "review" | "recovery" | "retry" | "cancelled" | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    instructions?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    title?: string | undefined;
    startedAt?: string | undefined;
    objective?: string | undefined;
    context?: Record<string, unknown> | undefined;
    constraints?: string[] | undefined;
    assignedAgentId?: string | null | undefined;
    inputs?: Record<string, unknown> | undefined;
    expectedOutputs?: string[] | undefined;
    successCriteria?: string[] | undefined;
    priority?: "low" | "medium" | "high" | "critical" | "emergency" | undefined;
    dependencies?: {
        taskId: string;
        type?: "blocks" | "requires_success" | "parallel_with" | "after" | undefined;
    }[] | undefined;
    verificationPlanId?: string | null | undefined;
    executionResult?: {
        success: boolean;
        exitCode?: number | undefined;
        summary?: string | undefined;
        outputArtifacts?: string[] | undefined;
        errorMessage?: string | undefined;
        errorStack?: string | undefined;
        executionDurationMs?: number | undefined;
    } | undefined;
    completedAt?: string | undefined;
}>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
//# sourceMappingURL=task.d.ts.map