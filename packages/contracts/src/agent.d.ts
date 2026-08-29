import { z } from "zod";
/**
 * Open-ended Agent Mode. Preset strings provided for convenience,
 * but any custom execution mode string is accepted.
 */
export declare const AgentModeSchema: z.ZodDefault<z.ZodString>;
export type AgentMode = z.infer<typeof AgentModeSchema>;
export declare const AgentStatusSchema: z.ZodEnum<["idle", "queued", "running", "paused", "blocked_approval", "verifying", "completed", "failed", "terminated"]>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
/**
 * Open-ended Agent Role. Synapse has NO FIXED AGENT TYPES.
 * Roles are user-configurable strings (e.g., "Financial Analyst", "DevOps Engineer", "Code Reviewer").
 */
export declare const AgentRoleSchema: z.ZodDefault<z.ZodString>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export declare const ToolCapabilitySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    autoApprove: z.ZodDefault<z.ZodBoolean>;
    rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
    parametersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    provider: z.ZodOptional<z.ZodString>;
    requiredSecrets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    enabled: boolean;
    autoApprove: boolean;
    requiredSecrets: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
    description?: string | undefined;
    rateLimitPerMinute?: number | undefined;
    parametersSchema?: Record<string, unknown> | undefined;
    provider?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    enabled?: boolean | undefined;
    autoApprove?: boolean | undefined;
    rateLimitPerMinute?: number | undefined;
    parametersSchema?: Record<string, unknown> | undefined;
    provider?: string | undefined;
    requiredSecrets?: string[] | undefined;
    riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
}>;
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;
export declare const AgentCapabilitiesSchema: z.ZodObject<{
    tools: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        autoApprove: z.ZodDefault<z.ZodBoolean>;
        rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
        parametersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        provider: z.ZodOptional<z.ZodString>;
        requiredSecrets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        enabled: boolean;
        autoApprove: boolean;
        requiredSecrets: string[];
        riskLevel: "low" | "medium" | "high" | "critical";
        description?: string | undefined;
        rateLimitPerMinute?: number | undefined;
        parametersSchema?: Record<string, unknown> | undefined;
        provider?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        enabled?: boolean | undefined;
        autoApprove?: boolean | undefined;
        rateLimitPerMinute?: number | undefined;
        parametersSchema?: Record<string, unknown> | undefined;
        provider?: string | undefined;
        requiredSecrets?: string[] | undefined;
        riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
    }>, "many">>;
    mcpServers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    connectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    customCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    filesystem: z.ZodDefault<z.ZodObject<{
        read: z.ZodDefault<z.ZodBoolean>;
        write: z.ZodDefault<z.ZodBoolean>;
        restrictedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        read: boolean;
        write: boolean;
        restrictedPaths: string[];
        allowedPaths: string[];
    }, {
        read?: boolean | undefined;
        write?: boolean | undefined;
        restrictedPaths?: string[] | undefined;
        allowedPaths?: string[] | undefined;
    }>>;
    network: z.ZodDefault<z.ZodObject<{
        allowedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        deniedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        allowHttp: z.ZodDefault<z.ZodBoolean>;
        allowMcp: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        allowedHosts: string[];
        deniedHosts: string[];
        allowHttp: boolean;
        allowMcp: boolean;
    }, {
        allowedHosts?: string[] | undefined;
        deniedHosts?: string[] | undefined;
        allowHttp?: boolean | undefined;
        allowMcp?: boolean | undefined;
    }>>;
    terminal: z.ZodDefault<z.ZodObject<{
        allowedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        deniedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requireSudo: z.ZodDefault<z.ZodBoolean>;
        maxExecutionTimeMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        allowedCommands: string[];
        deniedCommands: string[];
        requireSudo: boolean;
        maxExecutionTimeMs: number;
    }, {
        allowedCommands?: string[] | undefined;
        deniedCommands?: string[] | undefined;
        requireSudo?: boolean | undefined;
        maxExecutionTimeMs?: number | undefined;
    }>>;
    subagents: z.ZodDefault<z.ZodObject<{
        canSpawn: z.ZodDefault<z.ZodBoolean>;
        maxDepth: z.ZodDefault<z.ZodNumber>;
        maxChildren: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        canSpawn: boolean;
        maxDepth: number;
        maxChildren: number;
    }, {
        canSpawn?: boolean | undefined;
        maxDepth?: number | undefined;
        maxChildren?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    tools: {
        name: string;
        enabled: boolean;
        autoApprove: boolean;
        requiredSecrets: string[];
        riskLevel: "low" | "medium" | "high" | "critical";
        description?: string | undefined;
        rateLimitPerMinute?: number | undefined;
        parametersSchema?: Record<string, unknown> | undefined;
        provider?: string | undefined;
    }[];
    mcpServers: string[];
    connectors: string[];
    customCapabilities: string[];
    filesystem: {
        read: boolean;
        write: boolean;
        restrictedPaths: string[];
        allowedPaths: string[];
    };
    network: {
        allowedHosts: string[];
        deniedHosts: string[];
        allowHttp: boolean;
        allowMcp: boolean;
    };
    terminal: {
        allowedCommands: string[];
        deniedCommands: string[];
        requireSudo: boolean;
        maxExecutionTimeMs: number;
    };
    subagents: {
        canSpawn: boolean;
        maxDepth: number;
        maxChildren: number;
    };
}, {
    tools?: {
        name: string;
        description?: string | undefined;
        enabled?: boolean | undefined;
        autoApprove?: boolean | undefined;
        rateLimitPerMinute?: number | undefined;
        parametersSchema?: Record<string, unknown> | undefined;
        provider?: string | undefined;
        requiredSecrets?: string[] | undefined;
        riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
    }[] | undefined;
    mcpServers?: string[] | undefined;
    connectors?: string[] | undefined;
    customCapabilities?: string[] | undefined;
    filesystem?: {
        read?: boolean | undefined;
        write?: boolean | undefined;
        restrictedPaths?: string[] | undefined;
        allowedPaths?: string[] | undefined;
    } | undefined;
    network?: {
        allowedHosts?: string[] | undefined;
        deniedHosts?: string[] | undefined;
        allowHttp?: boolean | undefined;
        allowMcp?: boolean | undefined;
    } | undefined;
    terminal?: {
        allowedCommands?: string[] | undefined;
        deniedCommands?: string[] | undefined;
        requireSudo?: boolean | undefined;
        maxExecutionTimeMs?: number | undefined;
    } | undefined;
    subagents?: {
        canSpawn?: boolean | undefined;
        maxDepth?: number | undefined;
        maxChildren?: number | undefined;
    } | undefined;
}>;
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;
export declare const ModelConfigSchema: z.ZodObject<{
    provider: z.ZodString;
    modelId: z.ZodString;
    temperature: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    topP: z.ZodOptional<z.ZodNumber>;
    presencePenalty: z.ZodOptional<z.ZodNumber>;
    frequencyPenalty: z.ZodOptional<z.ZodNumber>;
    apiKeyId: z.ZodOptional<z.ZodString>;
    customEndpoint: z.ZodOptional<z.ZodString>;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    provider: string;
    modelId: string;
    temperature: number;
    parameters: Record<string, unknown>;
    maxTokens?: number | undefined;
    topP?: number | undefined;
    presencePenalty?: number | undefined;
    frequencyPenalty?: number | undefined;
    apiKeyId?: string | undefined;
    customEndpoint?: string | undefined;
}, {
    provider: string;
    modelId: string;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    topP?: number | undefined;
    presencePenalty?: number | undefined;
    frequencyPenalty?: number | undefined;
    apiKeyId?: string | undefined;
    customEndpoint?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
/**
 * Universal Agent Definition model adhering to capability-driven,
 * user-configurable architecture.
 */
export declare const AgentDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    identity: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodDefault<z.ZodString>;
        role: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        role: string;
        tags: string[];
    }, {
        name: string;
        description?: string | undefined;
        role?: string | undefined;
        tags?: string[] | undefined;
    }>;
    instructions: z.ZodObject<{
        systemPrompt: z.ZodDefault<z.ZodString>;
        objectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        behavioralRules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        customInstructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        systemPrompt: string;
        objectives: string[];
        behavioralRules: string[];
        customInstructions?: string | undefined;
    }, {
        systemPrompt?: string | undefined;
        objectives?: string[] | undefined;
        behavioralRules?: string[] | undefined;
        customInstructions?: string | undefined;
    }>;
    capabilities: z.ZodDefault<z.ZodObject<{
        tools: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            enabled: z.ZodDefault<z.ZodBoolean>;
            autoApprove: z.ZodDefault<z.ZodBoolean>;
            rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
            parametersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            provider: z.ZodOptional<z.ZodString>;
            requiredSecrets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }, {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }>, "many">>;
        mcpServers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        connectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        customCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        filesystem: z.ZodDefault<z.ZodObject<{
            read: z.ZodDefault<z.ZodBoolean>;
            write: z.ZodDefault<z.ZodBoolean>;
            restrictedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        }, {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        }>>;
        network: z.ZodDefault<z.ZodObject<{
            allowedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowHttp: z.ZodDefault<z.ZodBoolean>;
            allowMcp: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        }, {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        }>>;
        terminal: z.ZodDefault<z.ZodObject<{
            allowedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requireSudo: z.ZodDefault<z.ZodBoolean>;
            maxExecutionTimeMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        }, {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        }>>;
        subagents: z.ZodDefault<z.ZodObject<{
            canSpawn: z.ZodDefault<z.ZodBoolean>;
            maxDepth: z.ZodDefault<z.ZodNumber>;
            maxChildren: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        }, {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    }, {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    }>>;
    model: z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>;
    fallbackModels: z.ZodDefault<z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    workspace: z.ZodDefault<z.ZodObject<{
        repositories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        directories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        repositories: string[];
        directories: string[];
        environment: Record<string, string>;
    }, {
        repositories?: string[] | undefined;
        directories?: string[] | undefined;
        environment?: Record<string, string> | undefined;
    }>>;
    permissions: z.ZodDefault<z.ZodObject<{
        files: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        shell: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        network: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        credentials: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        productionAccess: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        network: string[];
        files: string[];
        shell: string[];
        credentials: string[];
        productionAccess: boolean;
    }, {
        network?: string[] | undefined;
        files?: string[] | undefined;
        shell?: string[] | undefined;
        credentials?: string[] | undefined;
        productionAccess?: boolean | undefined;
    }>>;
    knowledge: z.ZodDefault<z.ZodObject<{
        files: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        databases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        sources: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        files: string[];
        databases: string[];
        sources: string[];
    }, {
        files?: string[] | undefined;
        databases?: string[] | undefined;
        sources?: string[] | undefined;
    }>>;
    verification: z.ZodDefault<z.ZodObject<{
        strategies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        approvalRequirements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        minConfidence: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        strategies: string[];
        approvalRequirements: string[];
        minConfidence: number;
    }, {
        strategies?: string[] | undefined;
        approvalRequirements?: string[] | undefined;
        minConfidence?: number | undefined;
    }>>;
    resourceLimits: z.ZodDefault<z.ZodObject<{
        maxTokens: z.ZodOptional<z.ZodNumber>;
        maxRuntimeSeconds: z.ZodDefault<z.ZodNumber>;
        maxCostUsd: z.ZodOptional<z.ZodNumber>;
        maxConcurrency: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxRuntimeSeconds: number;
        maxConcurrency: number;
        maxTokens?: number | undefined;
        maxCostUsd?: number | undefined;
    }, {
        maxTokens?: number | undefined;
        maxRuntimeSeconds?: number | undefined;
        maxCostUsd?: number | undefined;
        maxConcurrency?: number | undefined;
    }>>;
    isTemplate: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    identity: {
        name: string;
        description: string;
        role: string;
        tags: string[];
    };
    instructions: {
        systemPrompt: string;
        objectives: string[];
        behavioralRules: string[];
        customInstructions?: string | undefined;
    };
    capabilities: {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    };
    model: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    };
    fallbackModels: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }[];
    workspace: {
        repositories: string[];
        directories: string[];
        environment: Record<string, string>;
    };
    permissions: {
        network: string[];
        files: string[];
        shell: string[];
        credentials: string[];
        productionAccess: boolean;
    };
    knowledge: {
        files: string[];
        databases: string[];
        sources: string[];
    };
    verification: {
        strategies: string[];
        approvalRequirements: string[];
        minConfidence: number;
    };
    resourceLimits: {
        maxRuntimeSeconds: number;
        maxConcurrency: number;
        maxTokens?: number | undefined;
        maxCostUsd?: number | undefined;
    };
    isTemplate: boolean;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    tenantId: string;
    identity: {
        name: string;
        description?: string | undefined;
        role?: string | undefined;
        tags?: string[] | undefined;
    };
    instructions: {
        systemPrompt?: string | undefined;
        objectives?: string[] | undefined;
        behavioralRules?: string[] | undefined;
        customInstructions?: string | undefined;
    };
    model: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    };
    capabilities?: {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    } | undefined;
    fallbackModels?: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    workspace?: {
        repositories?: string[] | undefined;
        directories?: string[] | undefined;
        environment?: Record<string, string> | undefined;
    } | undefined;
    permissions?: {
        network?: string[] | undefined;
        files?: string[] | undefined;
        shell?: string[] | undefined;
        credentials?: string[] | undefined;
        productionAccess?: boolean | undefined;
    } | undefined;
    knowledge?: {
        files?: string[] | undefined;
        databases?: string[] | undefined;
        sources?: string[] | undefined;
    } | undefined;
    verification?: {
        strategies?: string[] | undefined;
        approvalRequirements?: string[] | undefined;
        minConfidence?: number | undefined;
    } | undefined;
    resourceLimits?: {
        maxTokens?: number | undefined;
        maxRuntimeSeconds?: number | undefined;
        maxCostUsd?: number | undefined;
        maxConcurrency?: number | undefined;
    } | undefined;
    isTemplate?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}>;
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
/**
 * Compatible AgentConfig schema
 */
export declare const AgentConfigSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodDefault<z.ZodString>>;
    mode: z.ZodDefault<z.ZodDefault<z.ZodString>>;
    model: z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>;
    fallbackModels: z.ZodDefault<z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    systemPrompt: z.ZodDefault<z.ZodString>;
    customInstructions: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodDefault<z.ZodObject<{
        tools: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            enabled: z.ZodDefault<z.ZodBoolean>;
            autoApprove: z.ZodDefault<z.ZodBoolean>;
            rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
            parametersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            provider: z.ZodOptional<z.ZodString>;
            requiredSecrets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }, {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }>, "many">>;
        mcpServers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        connectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        customCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        filesystem: z.ZodDefault<z.ZodObject<{
            read: z.ZodDefault<z.ZodBoolean>;
            write: z.ZodDefault<z.ZodBoolean>;
            restrictedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        }, {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        }>>;
        network: z.ZodDefault<z.ZodObject<{
            allowedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowHttp: z.ZodDefault<z.ZodBoolean>;
            allowMcp: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        }, {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        }>>;
        terminal: z.ZodDefault<z.ZodObject<{
            allowedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requireSudo: z.ZodDefault<z.ZodBoolean>;
            maxExecutionTimeMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        }, {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        }>>;
        subagents: z.ZodDefault<z.ZodObject<{
            canSpawn: z.ZodDefault<z.ZodBoolean>;
            maxDepth: z.ZodDefault<z.ZodNumber>;
            maxChildren: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        }, {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    }, {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    }>>;
    timeoutSeconds: z.ZodDefault<z.ZodNumber>;
    maxBudgetUsd: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDefault<z.ZodString>;
    updatedAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    tenantId: string;
    role: string;
    systemPrompt: string;
    capabilities: {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    };
    model: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    };
    fallbackModels: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    mode: string;
    timeoutSeconds: number;
    description?: string | undefined;
    customInstructions?: string | undefined;
    maxBudgetUsd?: number | undefined;
}, {
    name: string;
    id: string;
    tenantId: string;
    model: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    };
    description?: string | undefined;
    role?: string | undefined;
    systemPrompt?: string | undefined;
    customInstructions?: string | undefined;
    capabilities?: {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    } | undefined;
    fallbackModels?: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    mode?: string | undefined;
    timeoutSeconds?: number | undefined;
    maxBudgetUsd?: number | undefined;
}>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export declare const CreateAgentRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodString>;
    mode: z.ZodDefault<z.ZodString>;
    model: z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>;
    fallbackModels: z.ZodDefault<z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    systemPrompt: z.ZodDefault<z.ZodString>;
    customInstructions: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodDefault<z.ZodObject<{
        tools: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            enabled: z.ZodDefault<z.ZodBoolean>;
            autoApprove: z.ZodDefault<z.ZodBoolean>;
            rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
            parametersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            provider: z.ZodOptional<z.ZodString>;
            requiredSecrets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }, {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }>, "many">>;
        mcpServers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        connectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        customCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        filesystem: z.ZodDefault<z.ZodObject<{
            read: z.ZodDefault<z.ZodBoolean>;
            write: z.ZodDefault<z.ZodBoolean>;
            restrictedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        }, {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        }>>;
        network: z.ZodDefault<z.ZodObject<{
            allowedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowHttp: z.ZodDefault<z.ZodBoolean>;
            allowMcp: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        }, {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        }>>;
        terminal: z.ZodDefault<z.ZodObject<{
            allowedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requireSudo: z.ZodDefault<z.ZodBoolean>;
            maxExecutionTimeMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        }, {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        }>>;
        subagents: z.ZodDefault<z.ZodObject<{
            canSpawn: z.ZodDefault<z.ZodBoolean>;
            maxDepth: z.ZodDefault<z.ZodNumber>;
            maxChildren: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        }, {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    }, {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    }>>;
    timeoutSeconds: z.ZodDefault<z.ZodNumber>;
    maxBudgetUsd: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tenantId: string;
    role: string;
    systemPrompt: string;
    capabilities: {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    };
    model: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    };
    fallbackModels: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }[];
    metadata: Record<string, unknown>;
    mode: string;
    timeoutSeconds: number;
    description?: string | undefined;
    customInstructions?: string | undefined;
    maxBudgetUsd?: number | undefined;
}, {
    name: string;
    tenantId: string;
    model: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    };
    description?: string | undefined;
    role?: string | undefined;
    systemPrompt?: string | undefined;
    customInstructions?: string | undefined;
    capabilities?: {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    } | undefined;
    fallbackModels?: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    mode?: string | undefined;
    timeoutSeconds?: number | undefined;
    maxBudgetUsd?: number | undefined;
}>;
export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;
export declare const UpdateAgentRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>>;
    fallbackModels: z.ZodOptional<z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        modelId: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
        apiKeyId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }, {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    systemPrompt: z.ZodOptional<z.ZodString>;
    customInstructions: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodOptional<z.ZodObject<{
        tools: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            enabled: z.ZodDefault<z.ZodBoolean>;
            autoApprove: z.ZodDefault<z.ZodBoolean>;
            rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
            parametersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            provider: z.ZodOptional<z.ZodString>;
            requiredSecrets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }, {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }>, "many">>;
        mcpServers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        connectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        customCapabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        filesystem: z.ZodDefault<z.ZodObject<{
            read: z.ZodDefault<z.ZodBoolean>;
            write: z.ZodDefault<z.ZodBoolean>;
            restrictedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        }, {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        }>>;
        network: z.ZodDefault<z.ZodObject<{
            allowedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedHosts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            allowHttp: z.ZodDefault<z.ZodBoolean>;
            allowMcp: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        }, {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        }>>;
        terminal: z.ZodDefault<z.ZodObject<{
            allowedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            deniedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requireSudo: z.ZodDefault<z.ZodBoolean>;
            maxExecutionTimeMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        }, {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        }>>;
        subagents: z.ZodDefault<z.ZodObject<{
            canSpawn: z.ZodDefault<z.ZodBoolean>;
            maxDepth: z.ZodDefault<z.ZodNumber>;
            maxChildren: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        }, {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    }, {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    }>>;
    timeoutSeconds: z.ZodOptional<z.ZodNumber>;
    maxBudgetUsd: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    role?: string | undefined;
    systemPrompt?: string | undefined;
    customInstructions?: string | undefined;
    capabilities?: {
        tools: {
            name: string;
            enabled: boolean;
            autoApprove: boolean;
            requiredSecrets: string[];
            riskLevel: "low" | "medium" | "high" | "critical";
            description?: string | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
        }[];
        mcpServers: string[];
        connectors: string[];
        customCapabilities: string[];
        filesystem: {
            read: boolean;
            write: boolean;
            restrictedPaths: string[];
            allowedPaths: string[];
        };
        network: {
            allowedHosts: string[];
            deniedHosts: string[];
            allowHttp: boolean;
            allowMcp: boolean;
        };
        terminal: {
            allowedCommands: string[];
            deniedCommands: string[];
            requireSudo: boolean;
            maxExecutionTimeMs: number;
        };
        subagents: {
            canSpawn: boolean;
            maxDepth: number;
            maxChildren: number;
        };
    } | undefined;
    model?: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    } | undefined;
    fallbackModels?: {
        provider: string;
        modelId: string;
        temperature: number;
        parameters: Record<string, unknown>;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    mode?: string | undefined;
    timeoutSeconds?: number | undefined;
    maxBudgetUsd?: number | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    role?: string | undefined;
    systemPrompt?: string | undefined;
    customInstructions?: string | undefined;
    capabilities?: {
        tools?: {
            name: string;
            description?: string | undefined;
            enabled?: boolean | undefined;
            autoApprove?: boolean | undefined;
            rateLimitPerMinute?: number | undefined;
            parametersSchema?: Record<string, unknown> | undefined;
            provider?: string | undefined;
            requiredSecrets?: string[] | undefined;
            riskLevel?: "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
        mcpServers?: string[] | undefined;
        connectors?: string[] | undefined;
        customCapabilities?: string[] | undefined;
        filesystem?: {
            read?: boolean | undefined;
            write?: boolean | undefined;
            restrictedPaths?: string[] | undefined;
            allowedPaths?: string[] | undefined;
        } | undefined;
        network?: {
            allowedHosts?: string[] | undefined;
            deniedHosts?: string[] | undefined;
            allowHttp?: boolean | undefined;
            allowMcp?: boolean | undefined;
        } | undefined;
        terminal?: {
            allowedCommands?: string[] | undefined;
            deniedCommands?: string[] | undefined;
            requireSudo?: boolean | undefined;
            maxExecutionTimeMs?: number | undefined;
        } | undefined;
        subagents?: {
            canSpawn?: boolean | undefined;
            maxDepth?: number | undefined;
            maxChildren?: number | undefined;
        } | undefined;
    } | undefined;
    model?: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    } | undefined;
    fallbackModels?: {
        provider: string;
        modelId: string;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        topP?: number | undefined;
        presencePenalty?: number | undefined;
        frequencyPenalty?: number | undefined;
        apiKeyId?: string | undefined;
        customEndpoint?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    mode?: string | undefined;
    timeoutSeconds?: number | undefined;
    maxBudgetUsd?: number | undefined;
}>;
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;
//# sourceMappingURL=agent.d.ts.map