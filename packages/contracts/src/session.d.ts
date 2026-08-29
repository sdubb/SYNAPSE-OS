import { z } from "zod";
export declare const SessionStatusSchema: z.ZodEnum<["initializing", "active", "paused", "awaiting_input", "awaiting_approval", "completed", "aborted", "failed", "timed_out"]>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export declare const SessionModeSchema: z.ZodEnum<["interactive", "batch", "scheduled", "simulation", "verification"]>;
export type SessionMode = z.infer<typeof SessionModeSchema>;
export declare const TokenUsageSchema: z.ZodObject<{
    promptTokens: z.ZodDefault<z.ZodNumber>;
    completionTokens: z.ZodDefault<z.ZodNumber>;
    totalTokens: z.ZodDefault<z.ZodNumber>;
    cacheReadTokens: z.ZodOptional<z.ZodNumber>;
    cacheWriteTokens: z.ZodOptional<z.ZodNumber>;
    estimatedCostUsd: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    cacheReadTokens?: number | undefined;
    cacheWriteTokens?: number | undefined;
}, {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    cacheReadTokens?: number | undefined;
    cacheWriteTokens?: number | undefined;
    estimatedCostUsd?: number | undefined;
}>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export declare const RuntimeMetadataSchema: z.ZodObject<{
    runtimeId: z.ZodString;
    hostMode: z.ZodEnum<["local", "remote", "hub", "sandboxed"]>;
    hostname: z.ZodOptional<z.ZodString>;
    pid: z.ZodOptional<z.ZodNumber>;
    nodeVersion: z.ZodOptional<z.ZodString>;
    osPlatform: z.ZodOptional<z.ZodString>;
    workingDirectory: z.ZodString;
    gitBranch: z.ZodOptional<z.ZodString>;
    gitCommitSha: z.ZodOptional<z.ZodString>;
    environmentVariables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    runtimeId: string;
    hostMode: "local" | "remote" | "hub" | "sandboxed";
    workingDirectory: string;
    environmentVariables: Record<string, string>;
    hostname?: string | undefined;
    pid?: number | undefined;
    nodeVersion?: string | undefined;
    osPlatform?: string | undefined;
    gitBranch?: string | undefined;
    gitCommitSha?: string | undefined;
}, {
    runtimeId: string;
    hostMode: "local" | "remote" | "hub" | "sandboxed";
    workingDirectory: string;
    hostname?: string | undefined;
    pid?: number | undefined;
    nodeVersion?: string | undefined;
    osPlatform?: string | undefined;
    gitBranch?: string | undefined;
    gitCommitSha?: string | undefined;
    environmentVariables?: Record<string, string> | undefined;
}>;
export type RuntimeMetadata = z.infer<typeof RuntimeMetadataSchema>;
export declare const SynapseSessionSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    agentId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    clineSessionId: z.ZodString;
    workspaceId: z.ZodString;
    runtimeId: z.ZodString;
    parentSessionId: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["initializing", "active", "paused", "awaiting_input", "awaiting_approval", "completed", "aborted", "failed", "timed_out"]>>;
    mode: z.ZodDefault<z.ZodEnum<["interactive", "batch", "scheduled", "simulation", "verification"]>>;
    title: z.ZodOptional<z.ZodString>;
    tokenUsage: z.ZodDefault<z.ZodObject<{
        promptTokens: z.ZodDefault<z.ZodNumber>;
        completionTokens: z.ZodDefault<z.ZodNumber>;
        totalTokens: z.ZodDefault<z.ZodNumber>;
        cacheReadTokens: z.ZodOptional<z.ZodNumber>;
        cacheWriteTokens: z.ZodOptional<z.ZodNumber>;
        estimatedCostUsd: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd: number;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
    }, {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
        estimatedCostUsd?: number | undefined;
    }>>;
    runtimeMetadata: z.ZodObject<{
        runtimeId: z.ZodString;
        hostMode: z.ZodEnum<["local", "remote", "hub", "sandboxed"]>;
        hostname: z.ZodOptional<z.ZodString>;
        pid: z.ZodOptional<z.ZodNumber>;
        nodeVersion: z.ZodOptional<z.ZodString>;
        osPlatform: z.ZodOptional<z.ZodString>;
        workingDirectory: z.ZodString;
        gitBranch: z.ZodOptional<z.ZodString>;
        gitCommitSha: z.ZodOptional<z.ZodString>;
        environmentVariables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        runtimeId: string;
        hostMode: "local" | "remote" | "hub" | "sandboxed";
        workingDirectory: string;
        environmentVariables: Record<string, string>;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
    }, {
        runtimeId: string;
        hostMode: "local" | "remote" | "hub" | "sandboxed";
        workingDirectory: string;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
        environmentVariables?: Record<string, string> | undefined;
    }>;
    activeCheckpoints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lastCheckpointId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    startedAt: z.ZodDefault<z.ZodString>;
    endedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "aborted" | "paused" | "completed" | "failed" | "initializing" | "active" | "awaiting_input" | "awaiting_approval" | "timed_out";
    id: string;
    tenantId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    mode: "verification" | "interactive" | "batch" | "scheduled" | "simulation";
    runtimeId: string;
    agentId: string;
    clineSessionId: string;
    workspaceId: string;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd: number;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
    };
    runtimeMetadata: {
        runtimeId: string;
        hostMode: "local" | "remote" | "hub" | "sandboxed";
        workingDirectory: string;
        environmentVariables: Record<string, string>;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
    };
    activeCheckpoints: string[];
    startedAt: string;
    taskId?: string | undefined;
    parentSessionId?: string | undefined;
    title?: string | undefined;
    lastCheckpointId?: string | undefined;
    endedAt?: string | undefined;
}, {
    id: string;
    tenantId: string;
    runtimeId: string;
    agentId: string;
    clineSessionId: string;
    workspaceId: string;
    runtimeMetadata: {
        runtimeId: string;
        hostMode: "local" | "remote" | "hub" | "sandboxed";
        workingDirectory: string;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
        environmentVariables?: Record<string, string> | undefined;
    };
    status?: "aborted" | "paused" | "completed" | "failed" | "initializing" | "active" | "awaiting_input" | "awaiting_approval" | "timed_out" | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    mode?: "verification" | "interactive" | "batch" | "scheduled" | "simulation" | undefined;
    taskId?: string | undefined;
    parentSessionId?: string | undefined;
    title?: string | undefined;
    tokenUsage?: {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
        estimatedCostUsd?: number | undefined;
    } | undefined;
    activeCheckpoints?: string[] | undefined;
    lastCheckpointId?: string | undefined;
    startedAt?: string | undefined;
    endedAt?: string | undefined;
}>;
export type SynapseSession = z.infer<typeof SynapseSessionSchema>;
export declare const CreateSessionRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    agentId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    workspaceId: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["interactive", "batch", "scheduled", "simulation", "verification"]>>;
    title: z.ZodOptional<z.ZodString>;
    initialPrompt: z.ZodOptional<z.ZodString>;
    runtimeMetadata: z.ZodOptional<z.ZodObject<{
        runtimeId: z.ZodOptional<z.ZodString>;
        hostMode: z.ZodOptional<z.ZodEnum<["local", "remote", "hub", "sandboxed"]>>;
        hostname: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        pid: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        nodeVersion: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        osPlatform: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        workingDirectory: z.ZodOptional<z.ZodString>;
        gitBranch: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        gitCommitSha: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        environmentVariables: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>>;
    }, "strip", z.ZodTypeAny, {
        runtimeId?: string | undefined;
        hostMode?: "local" | "remote" | "hub" | "sandboxed" | undefined;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        workingDirectory?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
        environmentVariables?: Record<string, string> | undefined;
    }, {
        runtimeId?: string | undefined;
        hostMode?: "local" | "remote" | "hub" | "sandboxed" | undefined;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        workingDirectory?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
        environmentVariables?: Record<string, string> | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    metadata: Record<string, unknown>;
    mode: "verification" | "interactive" | "batch" | "scheduled" | "simulation";
    agentId: string;
    workspaceId: string;
    taskId?: string | undefined;
    title?: string | undefined;
    runtimeMetadata?: {
        runtimeId?: string | undefined;
        hostMode?: "local" | "remote" | "hub" | "sandboxed" | undefined;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        workingDirectory?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
        environmentVariables?: Record<string, string> | undefined;
    } | undefined;
    initialPrompt?: string | undefined;
}, {
    tenantId: string;
    agentId: string;
    workspaceId: string;
    metadata?: Record<string, unknown> | undefined;
    mode?: "verification" | "interactive" | "batch" | "scheduled" | "simulation" | undefined;
    taskId?: string | undefined;
    title?: string | undefined;
    runtimeMetadata?: {
        runtimeId?: string | undefined;
        hostMode?: "local" | "remote" | "hub" | "sandboxed" | undefined;
        hostname?: string | undefined;
        pid?: number | undefined;
        nodeVersion?: string | undefined;
        osPlatform?: string | undefined;
        workingDirectory?: string | undefined;
        gitBranch?: string | undefined;
        gitCommitSha?: string | undefined;
        environmentVariables?: Record<string, string> | undefined;
    } | undefined;
    initialPrompt?: string | undefined;
}>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export declare const UpdateSessionRequestSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["initializing", "active", "paused", "awaiting_input", "awaiting_approval", "completed", "aborted", "failed", "timed_out"]>>;
    title: z.ZodOptional<z.ZodString>;
    tokenUsage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodDefault<z.ZodNumber>;
        completionTokens: z.ZodDefault<z.ZodNumber>;
        totalTokens: z.ZodDefault<z.ZodNumber>;
        cacheReadTokens: z.ZodOptional<z.ZodNumber>;
        cacheWriteTokens: z.ZodOptional<z.ZodNumber>;
        estimatedCostUsd: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd: number;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
    }, {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
        estimatedCostUsd?: number | undefined;
    }>>;
    lastCheckpointId: z.ZodOptional<z.ZodString>;
    endedAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "aborted" | "paused" | "completed" | "failed" | "initializing" | "active" | "awaiting_input" | "awaiting_approval" | "timed_out" | undefined;
    metadata?: Record<string, unknown> | undefined;
    title?: string | undefined;
    tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd: number;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
    } | undefined;
    lastCheckpointId?: string | undefined;
    endedAt?: string | undefined;
}, {
    status?: "aborted" | "paused" | "completed" | "failed" | "initializing" | "active" | "awaiting_input" | "awaiting_approval" | "timed_out" | undefined;
    metadata?: Record<string, unknown> | undefined;
    title?: string | undefined;
    tokenUsage?: {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
        cacheReadTokens?: number | undefined;
        cacheWriteTokens?: number | undefined;
        estimatedCostUsd?: number | undefined;
    } | undefined;
    lastCheckpointId?: string | undefined;
    endedAt?: string | undefined;
}>;
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;
//# sourceMappingURL=session.d.ts.map