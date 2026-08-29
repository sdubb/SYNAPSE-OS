/**
 * @file AgentSandbox.ts
 * @description Simulated environment sandbox for agent dry-runs, intercepting tool executions, computing blast radius, and preventing real-world side effects.
 */

import { WorldModel, type PropertyValue, GraphBuilder, GraphQuery, type BlastRadiusResult } from '@synapse/world-engine';
import { DigitalTwin } from '@synapse/twin-engine';
import { ConstraintEngine, type ConstraintEvaluationReport } from './ConstraintEngine.js';

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

export class AgentSandbox {
  public readonly id: string;
  public readonly agentId: string;
  private _isolatedModel: WorldModel;
  private readonly _constraintEngine: ConstraintEngine;
  private readonly _toolHandlers: Map<
    string,
    (params: Record<string, unknown>, model: WorldModel) => Promise<{ response: unknown; mutations?: Record<string, PropertyValue>; targetEntityId?: string }>
  > = new Map();

  private readonly _executedCalls: ToolDryRunResult[] = [];

  constructor(sandboxId: string, agentId: string, baseTwin: DigitalTwin) {
    this.id = sandboxId;
    this.agentId = agentId;
    this._isolatedModel = baseTwin.model.clone({ id: `sandbox_model_${sandboxId}` });
    this._constraintEngine = new ConstraintEngine();

    // Default safety boundaries in sandbox
    this._constraintEngine.registerSafetyBoundary(ConstraintEngine.createMaxLatencyBoundary());
    this._constraintEngine.registerSafetyBoundary(ConstraintEngine.createMaxErrorRateBoundary());
  }

  public get currentModel(): WorldModel {
    return this._isolatedModel;
  }

  public registerToolMock(
    toolName: string,
    handler: (
      params: Record<string, unknown>,
      model: WorldModel
    ) => Promise<{ response: unknown; mutations?: Record<string, PropertyValue>; targetEntityId?: string }>
  ): this {
    this._toolHandlers.set(toolName, handler);
    return this;
  }

  /**
   * Executes a dry-run tool call inside the isolated sandbox.
   */
  public async dryRunToolCall(call: InterceptedToolCall): Promise<ToolDryRunResult> {
    const startTime = Date.now();
    const mockHandler = this._toolHandlers.get(call.toolName);

    let simulatedResponse: unknown = { status: 'success', dryRun: true };
    let mutations: Record<string, PropertyValue> = {};
    let targetEntityId: string | undefined;

    if (mockHandler) {
      const result = await mockHandler(call.parameters, this._isolatedModel);
      simulatedResponse = result.response;
      mutations = result.mutations ?? {};
      targetEntityId = result.targetEntityId;
    } else {
      // Heuristic dry-run for unmocked tools
      if (call.parameters['entityId']) {
        targetEntityId = String(call.parameters['entityId']);
      } else if (call.parameters['id']) {
        targetEntityId = String(call.parameters['id']);
      }
      simulatedResponse = { simulated: true, tool: call.toolName, input: call.parameters };
    }

    // Apply predicted mutation to isolated sandbox model
    if (targetEntityId && Object.keys(mutations).length > 0) {
      const targetEntity = this._isolatedModel.getEntity(targetEntityId);
      if (targetEntity) {
        const updated = targetEntity.cloneWithState(mutations, {
          sourceSystem: `AgentSandbox:${this.agentId}`,
        });
        this._isolatedModel = this._isolatedModel.withEntity(updated);
      }
    }

    // Calculate blast radius using GraphQuery
    const graphBuilder = new GraphBuilder(this._isolatedModel);
    const graphQuery = new GraphQuery(graphBuilder);
    const blastRadius = targetEntityId
      ? graphQuery.calculateBlastRadius(targetEntityId, { maxDepth: 4 })
      : {
          rootEntityId: 'global',
          directlyImpacted: [],
          transitivelyImpacted: [],
          impactedRelationships: [],
          impactDepthMap: {},
          totalImpactScore: 0,
        };

    // Evaluate safety constraints on the mutated sandbox model
    const safetyViolations = this._constraintEngine.evaluate(this._isolatedModel);
    const allowed = safetyViolations.isValid;

    const dryRunResult: ToolDryRunResult = {
      callId: call.callId,
      toolName: call.toolName,
      allowed,
      predictedStateMutations: mutations,
      simulatedResponse,
      blastRadius,
      safetyViolations,
      executionTimeMs: Date.now() - startTime,
    };

    this._executedCalls.push(dryRunResult);
    return dryRunResult;
  }

  /**
   * Generates a comprehensive summary report of the agent's dry-run session.
   */
  public generateReport(): SandboxReport {
    const totalCalls = this._executedCalls.length;
    const allowedCalls = this._executedCalls.filter((c) => c.allowed).length;
    const blockedCalls = totalCalls - allowedCalls;

    const directlyImpacted = new Set<string>();
    const transitivelyImpacted = new Set<string>();
    let aggregatedBlastScore = 0;

    for (const call of this._executedCalls) {
      aggregatedBlastScore += call.blastRadius.totalImpactScore;
      for (const e of call.blastRadius.directlyImpacted) {
        directlyImpacted.add(e.id);
      }
      for (const e of call.blastRadius.transitivelyImpacted) {
        transitivelyImpacted.add(e.id);
      }
    }

    const isSafeToExecute = blockedCalls === 0;

    return {
      sandboxId: this.id,
      agentId: this.agentId,
      totalCalls,
      allowedCalls,
      blockedCalls,
      aggregatedBlastRadiusScore: Number(aggregatedBlastScore.toFixed(2)),
      directlyImpactedEntities: Array.from(directlyImpacted),
      transitivelyImpactedEntities: Array.from(transitivelyImpacted),
      allDryRunResults: Object.freeze([...this._executedCalls]),
      isSafeToExecute,
    };
  }
}
