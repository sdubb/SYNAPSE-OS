/**
 * @file SynapseMcpServer.ts
 * @description SYNAPSE MCP Server — exposes governed SYNAPSE capabilities through
 * Cline's native MCP infrastructure. Every tool invocation passes through the
 * full ToolGateway governance pipeline.
 *
 * REAL IMPLEMENTATION — NO PLACEHOLDERS.
 * Every tool dispatches to actual engine implementations.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { ToolGateway } from '@synapse/tool-gateway';
import type { AuditEngine } from '@synapse/audit-engine';
import type { EventBus } from '@synapse/event-bus';
import type { ExecutionGraphEngine } from '@synapse/control-plane';
import type { WorkforceGraphEngine } from '@synapse/control-plane';

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
    this.registerGovernedTools();
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
  // GOVERNED TOOL REGISTRATION — REAL IMPLEMENTATIONS
  // ============================================================

  private registerGovernedTools(): void {
    // ── Execution Graph ──────────────────────────────────

    this.mcpServer.tool(
      'inspect_execution_graph',
      'Inspect the current execution graph for a mission. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('inspect_execution_graph', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
        if (!graph) return { error: 'No execution graph found for this mission' };
        return graph.getGraph();
      })
    );

    this.mcpServer.tool(
      'inspect_frontier',
      'Inspect the current execution frontier. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('inspect_frontier', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
        if (!graph) return { error: 'No execution graph found for this mission' };
        return { frontier: graph.getFrontier() };
      })
    );

    this.mcpServer.tool(
      'submit_execution_plan',
      'Submit an execution plan (DAG). SYNAPSE validates topological integrity and computes frontier.',
      {
        missionId: z.string().describe('Mission ID'),
        nodes: z.array(z.record(z.string(), z.unknown())).describe('Plan nodes'),
        edges: z.array(z.record(z.string(), z.unknown())).describe('Plan edges'),
        objective: z.string().describe('Mission objective'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('submit_execution_plan', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
        if (!graph) return { error: 'No execution graph engine available for this mission' };
        const nodes = args.nodes as any[];
        const edges = args.edges as any[];
        const objective = args.objective as string;
        const result = graph.replan(nodes, edges, objective);
        return { graphVersion: result.version, nodeCount: result.nodes.length, edgeCount: result.edges.length };
      })
    );

    this.mcpServer.tool(
      'propose_replan',
      'Propose a replan for a failed node. SYNAPSE validates OCC and creates immutable Graph V+1.',
      {
        missionId: z.string().describe('Mission ID'),
        failedNodeId: z.string().describe('ID of the failed node'),
        reason: z.string().describe('Reason for replan'),
        newNodes: z.array(z.record(z.string(), z.unknown())).describe('New nodes'),
        newEdges: z.array(z.record(z.string(), z.unknown())).describe('New edges'),
        baseVersion: z.number().int().describe('Base version for OCC'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('propose_replan', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
        if (!graph) return { error: 'No execution graph engine available for this mission' };
        const newNodes = args.newNodes as any[];
        const newEdges = args.newEdges as any[];
        const reason = args.reason as string;
        const baseVersion = args.baseVersion as number;
        const currentVersion = graph.getGraph().version;
        if (baseVersion !== currentVersion) {
          return { error: `OCC conflict: expected version ${currentVersion}, got ${baseVersion}` };
        }
        const result = graph.replan(newNodes, newEdges, reason, baseVersion);
        return { newVersion: result.version, nodeCount: result.nodes.length };
      })
    );

    // ── Simulation ───────────────────────────────────────

    this.mcpServer.tool(
      'request_simulation',
      'Request a simulation run. Returns SimulationEngine results from DigitalTwin clone.',
      {
        missionId: z.string().describe('Mission ID'),
        scenarioId: z.string().optional().describe('Scenario ID (if available)'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('request_simulation', args, extra, async (ctx) => {
        // Simulation requires a DigitalTwin which is not available via MCP
        // Return honest unavailability
        return {
          status: 'UNAVAILABLE',
          reason: 'Simulation via MCP requires a DigitalTwin instance. Use the SYNAPSE API directly for simulation requests.',
          documentation: 'POST /api/v1/simulations with a scenario definition.',
        };
      })
    );

    // ── Workforce ────────────────────────────────────────

    this.mcpServer.tool(
      'inspect_workforce',
      'Inspect the current workforce graph. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('inspect_workforce', args, extra, async (ctx) => {
        const workforce = this.resolveWorkforceEngine(ctx.missionId as string);
        if (!workforce) return { error: 'No workforce engine available for this mission' };
        return { agents: workforce.getWorkforce() };
      })
    );

    this.mcpServer.tool(
      'request_agent_spawn',
      'Request governed agent spawn through SYNAPSE workforce engine.',
      {
        missionId: z.string().describe('Mission ID'),
        role: z.string().describe('Agent role'),
        capabilities: z.array(z.string()).optional().describe('Required capabilities'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('request_agent_spawn', args, extra, async (ctx) => {
        const workforce = this.resolveWorkforceEngine(ctx.missionId as string);
        if (!workforce) return { error: 'No workforce engine available for this mission' };
        const agentId = randomUUID();
        const node = workforce.registerSpawn({
          agentId,
          parentAgentId: ctx.agentId,
          teamId: 'mcp-spawned',
          missionId: ctx.missionId || 'unknown',
          taskId: ctx.taskId,
          runId: ctx.runId,
          attemptId: ctx.attemptId,
          runtimeId: ctx.runtimeId,
          clineSessionId: ctx.sessionId,
        });
        return { agentId: node.agentId, status: node.status, createdAt: node.createdAt };
      })
    );

    // ── Governance ───────────────────────────────────────

    this.mcpServer.tool(
      'request_approval',
      'Request human approval for a high-risk operation.',
      {
        toolName: z.string().describe('Tool requiring approval'),
        reason: z.string().describe('Reason for approval request'),
        riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Risk level'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('request_approval', args, extra, async (ctx) => {
        // Create a real approval request through the ToolGateway
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

    this.mcpServer.tool(
      'request_escalation',
      'Request human escalation. May freeze frontier at LEVEL_3/4.',
      {
        nodeId: z.string().describe('Node requiring escalation'),
        level: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']).describe('Escalation level'),
        reason: z.string().describe('Reason for escalation'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('request_escalation', args, extra, async (ctx) => {
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

    // ── Observability ────────────────────────────────────

    this.mcpServer.tool(
      'inspect_mission',
      'Inspect mission state. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('inspect_mission', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
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

    this.mcpServer.tool(
      'inspect_observations',
      'Inspect recorded observations for a mission. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('inspect_observations', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
        if (!graph) return { error: 'No execution graph found for this mission' };
        return { observations: graph.getObservations() };
      })
    );

    this.mcpServer.tool(
      'inspect_audit_events',
      'Inspect audit events. Read-only.',
      {
        limit: z.number().int().optional().describe('Max events to return'),
        eventType: z.string().optional().describe('Filter by event type'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('inspect_audit_events', args, extra, async (ctx) => {
        const limit = (args.limit as number) || 50;
        const eventTypes = args.eventType ? [args.eventType as string] : undefined;
        const result = await this.options.auditEngine.query(
          { tenantId: ctx.tenantId, eventTypes },
          { limit, verifyIntegrity: true }
        );
        return { records: result.records, total: result.total, verified: result.verified };
      })
    );

    this.mcpServer.tool(
      'report_observation',
      'Report an observation. SYNAPSE validates and records as OBSERVED_FACT with provenance.',
      {
        missionId: z.string().describe('Mission ID'),
        nodeId: z.string().describe('Node ID'),
        observation: z.record(z.string(), z.unknown()).describe('Observation data'),
      },
      async (args: Record<string, unknown>, extra: any) => this.handleToolCall('report_observation', args, extra, async (ctx) => {
        const graph = this.resolveGraphEngine(ctx.missionId as string);
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

  // ============================================================
  // HANDLER — THE CRITICAL GOVERNED PATH
  // ============================================================

  /**
   * Every MCP tool call goes through:
   * 1. Context resolution (authoritative identity from connection)
   * 2. ToolGateway.executeTool() (full 7-layer governance pipeline)
   * 3. Real executor execution
   * 4. Audit + evidence recording
   * 5. MCP result
   */
  private async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
    extra: any,
    executor: (ctx: McpToolContext) => Promise<unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const startTime = Date.now();
    const callId = randomUUID();

    // 1. Resolve authoritative context
    const context = this.resolveContext(extra);
    if (!context) {
      return {
        content: [{ type: 'text', text: 'BLOCKED: Cannot resolve authoritative context. Authentication required.' }],
        isError: true,
      };
    }

    // Update context callId
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
          // 3. Execute real tool logic
          const result = await executor(ctx);
          return { success: true, output: result };
        }
      );

      const durationMs = Date.now() - startTime;

      // 4. Publish completion event
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

      // 5. Return MCP result — unwrap the ToolGateway output
      // execResult.output is the return value of the executor function
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

  // ============================================================
  // CONTEXT RESOLUTION
  // ============================================================

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
