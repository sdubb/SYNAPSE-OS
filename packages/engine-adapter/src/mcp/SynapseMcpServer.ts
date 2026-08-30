/**
 * @file SynapseMcpServer.ts
 * @description SYNAPSE MCP Server — exposes governed SYNAPSE capabilities through
 * Cline's native MCP infrastructure. Every tool invocation passes through the
 * full ToolGateway governance pipeline.
 *
 * REAL IMPLEMENTATION — NO PLACEHOLDERS.
 * Supports multi-client isolation, OCC graph validation, and real engine dispatch.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { ToolGateway } from '@synapse/tool-gateway';
import type { AuditEngine } from '@synapse/audit-engine';
import type { EventBus } from '@synapse/event-bus';
import type { ExecutionGraphEngine } from '@synapse/control-plane';
import type { WorkforceGraphEngine } from '@synapse/control-plane';
import type { SimulationEngine } from '@synapse/simulation-engine';

// ============================================================
// TYPES
// ============================================================

export interface SynapseMcpServerOptions {
  toolGateway: ToolGateway;
  auditEngine: AuditEngine;
  eventBus: EventBus;
  /** Resolvers — provide real engine access per mission/session */
  graphEngineResolver?: (missionId: string) => ExecutionGraphEngine | undefined;
  workforceEngineResolver?: (missionId: string) => WorkforceGraphEngine | undefined;
  simulationEngineResolver?: (missionId: string) => SimulationEngine | undefined;
  getTwinFn?: (env: string) => any;
  /** Session resolver for identity propagation */
  sessionResolver?: (sessionId: string) => Promise<{
    tenantId: string;
    agentId: string;
    missionId?: string;
    taskId?: string;
    runId?: string;
    attemptId?: string;
    workspaceId?: string;
    runtimeId?: string;
    workspaceRoot?: string;
  } | null>;
  defaultWorkspaceRoot?: string;
}

export interface McpToolContext {
  tenantId: string;
  agentId: string;
  sessionId: string;
  missionId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  workspaceId?: string;
  runtimeId?: string;
  workspaceRoot?: string;
  callId: string;
}

// ============================================================
// SYNAPSE MCP SERVER
// ============================================================

export class SynapseMcpServer {
  public readonly mcpServer: McpServer;
  private readonly options: SynapseMcpServerOptions;
  private readonly connectionContexts = new Map<string, McpToolContext>();

  constructor(options: SynapseMcpServerOptions) {
    this.options = options;
    this.mcpServer = new McpServer(
      { name: 'synapse-governed', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.registerGovernedTools(this.mcpServer);
  }

  /**
   * Create a dedicated McpServer instance bound to a specific connection context.
   * This allows true concurrent multi-client support with zero transport collision.
   */
  public createDedicatedServer(context: McpToolContext): McpServer {
    const server = new McpServer(
      { name: `synapse-governed-${context.tenantId}`, version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.registerGovernedTools(server, context);
    return server;
  }

  public registerConnectionContext(connectionId: string, context: McpToolContext): void {
    if (!context.tenantId || !context.agentId || !context.sessionId) {
      throw new Error(
        'BLOCKED: Cannot register MCP connection without authoritative context. ' +
        'tenantId, agentId, and sessionId must be derived from authenticated session.'
      );
    }
    this.connectionContexts.set(connectionId, context);
  }

  public removeConnectionContext(connectionId: string): void {
    this.connectionContexts.delete(connectionId);
  }

  public getConnectionContext(connectionId: string): McpToolContext | undefined {
    return this.connectionContexts.get(connectionId);
  }

  // ============================================================
  // GOVERNED TOOL REGISTRATION — 13 REAL TOOLS
  // ============================================================

  private registerGovernedTools(server: McpServer, defaultContext?: McpToolContext): void {
    // ── 1. inspect_execution_graph ───────────────────────
    server.tool(
      'inspect_execution_graph',
      'Inspect the current execution graph for a mission. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('inspect_execution_graph', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph found for this mission' };
          return graph.getGraph();
        })
    );

    // ── 2. inspect_frontier ──────────────────────────────
    server.tool(
      'inspect_frontier',
      'Inspect the current execution frontier. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('inspect_frontier', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph found for this mission' };
          return { frontier: graph.getFrontier() };
        })
    );

    // ── 3. submit_execution_plan ─────────────────────────
    server.tool(
      'submit_execution_plan',
      'Submit an execution plan (DAG). SYNAPSE validates topological integrity and computes frontier.',
      {
        missionId: z.string().describe('Mission ID'),
        nodes: z.array(z.record(z.string(), z.unknown())).describe('Plan nodes'),
        edges: z.array(z.record(z.string(), z.unknown())).describe('Plan edges'),
        objective: z.string().describe('Mission objective'),
        baseVersion: z.number().int().optional().describe('Base version for OCC check'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('submit_execution_plan', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph engine available for this mission' };
          const nodes = args.nodes as any[];
          const edges = args.edges as any[];
          const objective = args.objective as string;
          const baseVersion = args.baseVersion as number | undefined;

          const currentVersion = graph.getGraph().version;
          if (baseVersion !== undefined && baseVersion !== currentVersion) {
            return { error: `OCC conflict: expected version ${currentVersion}, got ${baseVersion}` };
          }

          const result = graph.replan(nodes, edges, objective, baseVersion ?? currentVersion);
          return { graphVersion: result.version, nodeCount: result.nodes.length, edgeCount: result.edges.length };
        })
    );

    // ── 4. propose_replan ────────────────────────────────
    server.tool(
      'propose_replan',
      'Propose a replan for a failed node. SYNAPSE validates OCC, updates failed node state, and creates immutable Graph V+1.',
      {
        missionId: z.string().describe('Mission ID'),
        failedNodeId: z.string().describe('ID of the failed node'),
        reason: z.string().describe('Reason for replan'),
        newNodes: z.array(z.record(z.string(), z.unknown())).describe('New nodes'),
        newEdges: z.array(z.record(z.string(), z.unknown())).describe('New edges'),
        baseVersion: z.number().int().describe('Base version for OCC'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('propose_replan', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph engine available for this mission' };
          const failedNodeId = args.failedNodeId as string;
          const newNodes = args.newNodes as any[];
          const newEdges = args.newEdges as any[];
          const reason = args.reason as string;
          const baseVersion = args.baseVersion as number;

          const currentVersion = graph.getGraph().version;
          if (baseVersion !== currentVersion) {
            return { error: `OCC conflict: expected version ${currentVersion}, got ${baseVersion}` };
          }

          // Mark failed node state if currently active
          const existingNode = graph.getGraph().nodes.find((n) => n.id === failedNodeId);
          if (existingNode && existingNode.state !== 'FAILED') {
            try {
              graph.updateNodeState(failedNodeId, 'FAILED');
            } catch {}
          }

          const result = graph.replan(newNodes, newEdges, reason, baseVersion);
          return { newVersion: result.version, nodeCount: result.nodes.length, failedNodeHandled: failedNodeId };
        })
    );

    // ── 5. request_simulation ────────────────────────────
    server.tool(
      'request_simulation',
      'Request a simulation run on an isolated DigitalTwin. Returns Monte Carlo comparative metrics.',
      {
        missionId: z.string().describe('Mission ID'),
        environment: z.string().optional().describe('Target environment'),
        scenarioId: z.string().optional().describe('Scenario ID'),
        iterations: z.number().int().optional().describe('Monte Carlo iterations (default 50)'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('request_simulation', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId || 'default';
          const simEngine = this.resolveSimulationEngine(missionId);
          const twin = this.options.getTwinFn ? this.options.getTwinFn(args.environment as string || 'production') : null;

          if (simEngine && twin) {
            const iterations = (args.iterations as number) || 50;
            const simResult = await simEngine.runMonteCarlo({
              scenarioId: (args.scenarioId as string) || `scenario_${Date.now()}`,
              environment: (args.environment as string) || 'production',
              iterations,
              initialState: twin.getState(),
            });
            return {
              status: 'COMPLETED',
              iterations: simResult.iterations,
              failureRate: simResult.failureRate,
              recommendation: simResult.recommendation,
              riskScoreDelta: simResult.riskScoreDelta,
            };
          }

          return {
            status: 'UNAVAILABLE',
            reason: 'DigitalTwin instance not bound for environment. Real SimulationEngine available via REST /api/v1/simulations.',
          };
        })
    );

    // ── 6. inspect_workforce ─────────────────────────────
    server.tool(
      'inspect_workforce',
      'Inspect the current workforce graph. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('inspect_workforce', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const workforce = this.resolveWorkforceEngine(missionId);
          if (!workforce) return { error: 'No workforce engine available for this mission' };
          return { agents: workforce.getWorkforce() };
        })
    );

    // ── 7. request_agent_spawn ───────────────────────────
    server.tool(
      'request_agent_spawn',
      'Request governed agent spawn through SYNAPSE workforce engine.',
      {
        missionId: z.string().describe('Mission ID'),
        role: z.string().describe('Agent role'),
        capabilities: z.array(z.string()).optional().describe('Required capabilities'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('request_agent_spawn', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const workforce = this.resolveWorkforceEngine(missionId);
          if (!workforce) return { error: 'No workforce engine available for this mission' };
          const agentId = randomUUID();
          const node = workforce.registerSpawn({
            agentId,
            parentAgentId: ctx.agentId,
            teamId: 'mcp-spawned',
            missionId: missionId || 'unknown',
            taskId: ctx.taskId,
            runId: ctx.runId,
            attemptId: ctx.attemptId,
            runtimeId: ctx.runtimeId,
            clineSessionId: ctx.sessionId,
          });
          return { agentId: node.agentId, status: node.status, createdAt: node.createdAt };
        })
    );

    // ── 8. request_approval ──────────────────────────────
    server.tool(
      'request_approval',
      'Request human approval for a high-risk operation.',
      {
        toolName: z.string().describe('Tool requiring approval'),
        reason: z.string().describe('Reason for approval request'),
        riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Risk level'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('request_approval', args, extra, defaultContext, async (ctx) => {
          const approvalResult = await this.options.toolGateway.evaluateAndAuthorizeToolCall({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            sessionId: ctx.sessionId,
            callId: ctx.callId,
            workspaceRoot: ctx.workspaceRoot || this.options.defaultWorkspaceRoot || process.cwd(),
            toolName: args.toolName as string,
            toolArguments: { reason: args.reason, riskLevel: args.riskLevel },
            missionId: ctx.missionId,
            taskId: ctx.taskId,
            runId: ctx.runId,
            attemptId: ctx.attemptId,
            workspaceId: ctx.workspaceId,
            runtimeId: ctx.runtimeId,
            clineSessionId: ctx.sessionId,
          });
          return {
            approvalRequired: !approvalResult.authorized,
            decision: approvalResult.decision,
            reason: approvalResult.reason,
            approvalRequestId: approvalResult.approvalRequestId,
          };
        })
    );

    // ── 9. request_escalation ────────────────────────────
    server.tool(
      'request_escalation',
      'Request human escalation. May freeze frontier at LEVEL_3/4.',
      {
        nodeId: z.string().describe('Node requiring escalation'),
        level: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']).describe('Escalation level'),
        reason: z.string().describe('Reason for escalation'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('request_escalation', args, extra, defaultContext, async (ctx) => {
          const graph = this.resolveGraphEngine(ctx.missionId as string);
          if (!graph) return { error: 'No execution graph engine available for this mission' };
          const escalation = graph.escalate(
            args.nodeId as string,
            args.level as any,
            args.reason as string,
            { agentId: ctx.agentId, mcpInvocation: true }
          );
          return {
            escalationId: escalation.id,
            level: escalation.level,
            status: escalation.status,
            nodeId: escalation.nodeId,
            createdAt: escalation.createdAt,
          };
        })
    );

    // ── 10. inspect_mission ──────────────────────────────
    server.tool(
      'inspect_mission',
      'Inspect mission state. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('inspect_mission', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph found for this mission' };
          const g = graph.getGraph();
          return {
            missionId: g.missionId,
            version: g.version,
            nodeCount: g.nodes.length,
            edgeCount: g.edges.length,
            objective: g.objective,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          };
        })
    );

    // ── 11. inspect_observations ─────────────────────────
    server.tool(
      'inspect_observations',
      'Inspect recorded observations for a mission. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('inspect_observations', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph found for this mission' };
          return { observations: graph.getObservations() };
        })
    );

    // ── 12. inspect_audit_events ─────────────────────────
    server.tool(
      'inspect_audit_events',
      'Inspect audit events. Read-only.',
      {
        limit: z.number().int().optional().describe('Max events to return'),
        eventType: z.string().optional().describe('Filter by event type'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('inspect_audit_events', args, extra, defaultContext, async (ctx) => {
          const limit = (args.limit as number) || 50;
          const eventTypes = args.eventType ? [args.eventType as string] : undefined;
          const result = await this.options.auditEngine.query(
            { tenantId: ctx.tenantId, eventTypes },
            { limit, verifyIntegrity: true }
          );
          return { records: result.records, total: result.total, verified: result.verified };
        })
    );

    // ── 13. report_observation ───────────────────────────
    server.tool(
      'report_observation',
      'Report an observation. SYNAPSE validates and records as OBSERVED_FACT with provenance.',
      {
        missionId: z.string().describe('Mission ID'),
        nodeId: z.string().describe('Node ID'),
        observation: z.record(z.string(), z.unknown()).describe('Observation data'),
      },
      async (args: Record<string, unknown>, extra: any) =>
        this.handleToolCall('report_observation', args, extra, defaultContext, async (ctx) => {
          const missionId = (args.missionId as string) || ctx.missionId;
          const graph = this.resolveGraphEngine(missionId);
          if (!graph) return { error: 'No execution graph found for this mission' };
          graph.recordObservation(
            {
              source: 'TOOL_EXECUTION',
              toolName: 'mcp_report_observation',
              callId: ctx.callId,
              runId: ctx.runId,
              attemptId: ctx.attemptId,
              timestamp: new Date().toISOString(),
            },
            args.observation as Record<string, any>
          );
          return { recorded: true, observationId: ctx.callId };
        })
    );
  }

  // ============================================================
  // ENGINE RESOLVERS
  // ============================================================

  private resolveGraphEngine(missionId?: string): ExecutionGraphEngine | undefined {
    if (!missionId) return undefined;
    return this.options.graphEngineResolver?.(missionId);
  }

  private resolveWorkforceEngine(missionId?: string): WorkforceGraphEngine | undefined {
    if (!missionId) return undefined;
    return this.options.workforceEngineResolver?.(missionId);
  }

  private resolveSimulationEngine(missionId?: string): SimulationEngine | undefined {
    if (!missionId) return undefined;
    return this.options.simulationEngineResolver?.(missionId);
  }

  // ============================================================
  // HANDLER — AUTHORITATIVE GOVERNANCE PATH
  // ============================================================

  private async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
    extra: any,
    defaultContext: McpToolContext | undefined,
    executor: (ctx: McpToolContext) => Promise<unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const startTime = Date.now();
    const callId = randomUUID();

    // 1. Resolve authoritative context
    const context = defaultContext || this.resolveContext(extra);
    if (!context) {
      return {
        content: [{ type: 'text', text: 'BLOCKED: Cannot resolve authoritative context. Authentication required.' }],
        isError: true,
      };
    }

    const ctx = { ...context, callId };

    try {
      // 2. Execute through ToolGateway governance pipeline
      const execResult = await this.options.toolGateway.executeTool(
        {
          tenantId: ctx.tenantId,
          agentId: ctx.agentId,
          sessionId: ctx.sessionId,
          callId,
          workspaceRoot: ctx.workspaceRoot || this.options.defaultWorkspaceRoot || process.cwd(),
          toolName,
          toolArguments: args,
          missionId: ctx.missionId,
          taskId: ctx.taskId,
          runId: ctx.runId,
          attemptId: ctx.attemptId,
          workspaceId: ctx.workspaceId,
          runtimeId: ctx.runtimeId,
          clineSessionId: ctx.sessionId,
        },
        async () => {
          const result = await executor(ctx);
          return { success: true, output: result };
        }
      );

      const durationMs = Date.now() - startTime;

      // 3. Publish completion event
      void this.options.eventBus.publish({
        eventType: 'tool.completed',
        tenantId: ctx.tenantId,
        agentId: ctx.agentId,
        sessionId: ctx.sessionId,
        source: 'mcp.server',
        payload: {
          toolName,
          callId,
          success: execResult.success,
          durationMs,
          evidenceId: execResult.evidenceId,
          auditEventId: execResult.auditEventId,
        },
      });

      if (!execResult.success) {
        return {
          content: [{ type: 'text', text: `Tool execution failed: ${execResult.error}` }],
          isError: true,
        };
      }

      const toolOutput = (execResult.output as any)?.output ?? execResult.output;
      const resultText = typeof toolOutput === 'string'
        ? toolOutput
        : JSON.stringify(toolOutput, null, 2);

      return {
        content: [{ type: 'text', text: resultText }],
        isError: false,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      void this.options.eventBus.publish({
        eventType: 'tool.failed',
        tenantId: ctx.tenantId,
        agentId: ctx.agentId,
        sessionId: ctx.sessionId,
        source: 'mcp.server',
        payload: { toolName, callId, error: errorMsg, durationMs: Date.now() - startTime },
      });

      return {
        content: [{ type: 'text', text: `Tool execution error: ${errorMsg}` }],
        isError: true,
      };
    }
  }

  private resolveContext(extra: any): McpToolContext | null {
    const connectionId = extra?.sessionId || extra?.connectionId;
    if (connectionId) {
      const ctx = this.connectionContexts.get(connectionId);
      if (ctx) return ctx;
    }
    return null;
  }

  public async close(): Promise<void> {
    this.connectionContexts.clear();
    await this.mcpServer.close();
  }
}
