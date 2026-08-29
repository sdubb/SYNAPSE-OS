/**
 * @file AgentSandbox.ts
 * @description Simulated environment sandbox for agent dry-runs, intercepting tool executions, computing blast radius, and preventing real-world side effects.
 */
import { WorldModel, type PropertyValue, type BlastRadiusResult } from '@synapse/world-engine';
import { DigitalTwin } from '@synapse/twin-engine';
import { type ConstraintEvaluationReport } from './ConstraintEngine.js';
export interface InterceptedToolCall {
    readonly callId: string;
    readonly agentId: string;
    readonly toolName: string;
    readonly parameters: Record<string, unknown>;
    readonly timestamp: number;
}
export interface ToolDryRunResult {
    readonly callId: string;
    readonly toolName: string;
    readonly allowed: boolean;
    readonly predictedStateMutations: Record<string, PropertyValue>;
    readonly simulatedResponse: unknown;
    readonly blastRadius: BlastRadiusResult;
    readonly safetyViolations: ConstraintEvaluationReport;
    readonly executionTimeMs: number;
}
export interface SandboxReport {
    readonly sandboxId: string;
    readonly agentId: string;
    readonly totalCalls: number;
    readonly allowedCalls: number;
    readonly blockedCalls: number;
    readonly aggregatedBlastRadiusScore: number;
    readonly directlyImpactedEntities: readonly string[];
    readonly transitivelyImpactedEntities: readonly string[];
    readonly allDryRunResults: readonly ToolDryRunResult[];
    readonly isSafeToExecute: boolean;
}
export declare class AgentSandbox {
    readonly id: string;
    readonly agentId: string;
    private _isolatedModel;
    private readonly _constraintEngine;
    private readonly _toolHandlers;
    private readonly _executedCalls;
    constructor(sandboxId: string, agentId: string, baseTwin: DigitalTwin);
    get currentModel(): WorldModel;
    registerToolMock(toolName: string, handler: (params: Record<string, unknown>, model: WorldModel) => Promise<{
        response: unknown;
        mutations?: Record<string, PropertyValue>;
        targetEntityId?: string;
    }>): this;
    /**
     * Executes a dry-run tool call inside the isolated sandbox.
     */
    dryRunToolCall(call: InterceptedToolCall): Promise<ToolDryRunResult>;
    /**
     * Generates a comprehensive summary report of the agent's dry-run session.
     */
    generateReport(): SandboxReport;
}
//# sourceMappingURL=AgentSandbox.d.ts.map