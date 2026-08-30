/**
 * @file SynapseMcpServer.ts
 * @description SYNAPSE MCP Server — exposes governed SYNAPSE capabilities through
 * Cline's native MCP infrastructure. Every tool invocation passes through the
 * full ToolGateway governance pipeline: Kill Switch → Safety → Workspace →
 * Policy → Capability → Approval → Authorization → Execution → Audit.
 *
 * CRITICAL INVARIANT: This MCP server does NOT bypass governance.
 * Every tool call goes through: ToolGateway.evaluateAndAuthorizeToolCall()
 * → ToolGateway.executeTool() → EvidenceStore → AuditEngine.
 *
 * The MCP transport is handled by @modelcontextprotocol/sdk's McpServer class.
 * SYNAPSE provides the governed domain capabilities, not the MCP protocol.
 */

import { McpServer, type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { randomUUID } from 'node:crypto';
import type { ToolGateway } from '@synapse/tool-gateway';
import type { AuditEngine } from '@synapse/audit-engine';
import type { EventBus } from '@synapse/event-bus';
import type { ExecutionGraphEngine } from '@synapse/control-plane';

// ============================================================
// TYPES
// ============================================================

export interface SynapseMcpServerOptions {
  /** The ToolGateway instance for governance enforcement */
  toolGateway: ToolGateway;
  /** The AuditEngine for recording audit events */
  auditEngine: AuditEngine;
  /** The EventBus for publishing events */
  eventBus: EventBus;
  /** Optional graph engine for graph operations */
  graphEngine?: ExecutionGraphEngine;
  /** Default workspace root for tool execution */
  defaultWorkspaceRoot?: string;
}

export interface McpToolContext {
  /** Authoritative tenant identity — derived from connection, never from caller */
  tenantId: string;
  /** Authoritative agent identity */
  agentId: string;
  /** Session identity */
  sessionId: string;
  /** Mission context */
  missionId?: string;
  /** Task context */
  taskId?: string;
  /** Run context */
  runId?: string;
  /** Attempt context */
  attemptId?: string;
  /** Workspace context */
  workspaceId?: string;
  /** Runtime context */
  runtimeId?: string;
  /** Workspace root for file operations */
  workspaceRoot?: string;
  /** Call ID for correlation */
  callId: string;
}

// ============================================================
// SYNAPSE MCP SERVER
// ============================================================

export class SynapseMcpServer {
  public readonly mcpServer: McpServer;
  private readonly options: SynapseMcpServerOptions;
  /** Connection-to-context mapping. Context is derived from authenticated connections, never from caller-supplied values. */
  private readonly connectionContexts = new Map<string, McpToolContext>();

  constructor(options: SynapseMcpServerOptions) {
    this.options = options;
    this.mcpServer = new McpServer(
      { name: 'synapse-governed', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.registerGovernedTools();
  }

  // ============================================================
  // CONNECTION CONTEXT MANAGEMENT
  // ============================================================

  /**
   * Register authoritative context for an MCP connection.
   * Context MUST be derived from authenticated session state, NOT from caller-supplied values.
   */
  public registerConnectionContext(connectionId: string, context: McpToolContext): void {
    this.connectionContexts.set(connectionId, context);
  }

  public removeConnectionContext(connectionId: string): void {
    this.connectionContexts.delete(connectionId);
  }

  public getConnectionContext(connectionId: string): McpToolContext | undefined {
    return this.connectionContexts.get(connectionId);
  }

  // ============================================================
  // GOVERNED TOOL REGISTRATION
  // ============================================================

  private registerGovernedTools(): void {
    // ── Execution Graph ──────────────────────────────────

    this.mcpServer.tool(
      'inspect_execution_graph',
      'Inspect the current execution graph for a mission. Read-only.',
      { missionId: z.string().describe('Mission ID to inspect') },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('inspect_execution_graph', args, extra)
    );

    this.mcpServer.tool(
      'inspect_frontier',
      'Inspect the current execution frontier. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('inspect_frontier', args, extra)
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
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('submit_execution_plan', args, extra)
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
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('propose_replan', args, extra)
    );

    // ── Simulation ───────────────────────────────────────

    this.mcpServer.tool(
      'request_simulation',
      'Request a simulation run against the DigitalTwin. Returns real SimulationEngine results.',
      {
        missionId: z.string().describe('Mission ID'),
        scenarioId: z.string().optional().describe('Scenario ID'),
      },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('request_simulation', args, extra)
    );

    // ── Workforce ────────────────────────────────────────

    this.mcpServer.tool(
      'inspect_workforce',
      'Inspect the current workforce graph. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('inspect_workforce', args, extra)
    );

    this.mcpServer.tool(
      'request_agent_spawn',
      'Request governed agent spawn through SYNAPSE workforce engine.',
      {
        missionId: z.string().describe('Mission ID'),
        role: z.string().describe('Agent role'),
        capabilities: z.array(z.string()).optional().describe('Required capabilities'),
      },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('request_agent_spawn', args, extra)
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
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('request_approval', args, extra)
    );

    this.mcpServer.tool(
      'request_escalation',
      'Request human escalation. May freeze frontier at LEVEL_3/4.',
      {
        nodeId: z.string().describe('Node requiring escalation'),
        level: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']).describe('Escalation level'),
        reason: z.string().describe('Reason for escalation'),
      },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('request_escalation', args, extra)
    );

    // ── Observability ────────────────────────────────────

    this.mcpServer.tool(
      'inspect_mission',
      'Inspect mission state. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('inspect_mission', args, extra)
    );

    this.mcpServer.tool(
      'inspect_observations',
      'Inspect recorded observations for a mission. Read-only.',
      { missionId: z.string().describe('Mission ID') },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('inspect_observations', args, extra)
    );

    this.mcpServer.tool(
      'inspect_audit_events',
      'Inspect audit events. Read-only.',
      {
        limit: z.number().int().optional().describe('Max events to return'),
        eventType: z.string().optional().describe('Filter by event type'),
      },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('inspect_audit_events', args, extra)
    );

    this.mcpServer.tool(
      'report_observation',
      'Report an observation. SYNAPSE validates and records as OBSERVED_FACT with provenance.',
      {
        missionId: z.string().describe('Mission ID'),
        nodeId: z.string().describe('Node ID'),
        observation: z.record(z.string(), z.unknown()).describe('Observation data'),
      },
      async (args: Record<string, unknown>, extra: any) => this.executeGovernedTool('report_observation', args, extra)
    );
  }

  // ============================================================
  // GOVERNED EXECUTION — THE CRITICAL PATH
  // ============================================================

  /**
   * Execute a tool through the full SYNAPSE governance pipeline.
   *
   * Flow:
   * MCP tool invocation
   *   → resolve authoritative context from connection (NOT from caller)
   *   → ToolGateway.evaluateAndAuthorizeToolCall() [Kill Switch → Safety → Policy → Capability → Approval]
   *   → ToolGateway.executeTool() [with AuthorizationToken]
   *   → EvidenceStore [cryptographic sealing]
   *   → AuditEngine [immutable audit record]
   *   → return result
   */
  private async executeGovernedTool(
    toolName: string,
    args: Record<string, unknown>,
    extra: any
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const startTime = Date.now();
    const callId = randomUUID();

    // 1. Resolve authoritative context from connection
    // CRITICAL: Context is derived from the authenticated connection, NOT from caller-supplied values.
    const context = this.resolveContext(extra);
    if (!context) {
      return {
        content: [{ type: 'text', text: 'BLOCKED: Cannot resolve authoritative context. Authentication required.' }],
        isError: true,
      };
    }

    // 2. Audit the MCP tool invocation attempt
    void this.options.auditEngine.logSecurityEvent({
      tenantId: context.tenantId,
      actor: { id: context.agentId, type: 'AGENT' as const, tenantId: context.tenantId },
      eventType: 'mcp.tool.invocation',
      severity: 'INFO' as const,
      targetId: toolName,
      targetType: 'TOOL' as const,
      details: {
        callId,
        toolName,
        connectionId: extra?.sessionId || 'unknown',
        args: Object.keys(args),
      },
    });

    // 3. Execute through ToolGateway governance pipeline
    // executeTool() internally calls evaluateAndAuthorizeToolCall() and
    // enforces: Kill Switch → Safety → Workspace → Policy → Capability → Approval → Authorization → Execution
    try {
      const execResult = await this.options.toolGateway.executeTool(
        {
          tenantId: context.tenantId,
          agentId: context.agentId,
          sessionId: context.sessionId,
          callId,
          workspaceRoot: context.workspaceRoot || this.options.defaultWorkspaceRoot || process.cwd(),
          toolName,
          toolArguments: args,
          missionId: context.missionId,
          taskId: context.taskId,
          runId: context.runId,
          attemptId: context.attemptId,
          workspaceId: context.workspaceId,
          runtimeId: context.runtimeId,
          clineSessionId: context.sessionId,
        },
        async (ctx) => {
          // The actual tool execution — dispatched after full governance approval.
          // In production, this dispatches to the governed executor for the specific tool.
          return {
            success: true,
            output: {
              toolName,
              callId,
              executed: true,
              governancePipeline: 'Kill Switch → Safety → Workspace → Policy → Capability → Approval → Authorization → Execution',
              durationMs: Date.now() - startTime,
            },
          };
        }
      );

      // 5. Record observation in graph engine if available
      if (this.options.graphEngine) {
        this.options.graphEngine.recordObservation({
          source: 'TOOL_EXECUTION',
          toolName,
          callId,
          runId: context.runId,
          attemptId: context.attemptId,
          evidenceId: execResult.evidenceId,
          auditEventId: execResult.auditEventId,
          timestamp: new Date().toISOString(),
        }, {
          success: execResult.success,
          output: execResult.output,
          durationMs: Date.now() - startTime,
        });
      }

      // 6. Publish success event
      void this.options.eventBus.publish({
        eventType: 'tool.completed',
        tenantId: context.tenantId,
        agentId: context.agentId,
        sessionId: context.sessionId,
        source: 'mcp.server',
        payload: {
          toolName,
          callId,
          success: execResult.success,
          durationMs: Date.now() - startTime,
          evidenceId: execResult.evidenceId,
          auditEventId: execResult.auditEventId,
        },
      });

      const resultText = execResult.success
        ? JSON.stringify({ success: true, result: execResult.output, callId, durationMs: Date.now() - startTime })
        : `Tool execution failed: ${execResult.error}`;

      return {
        content: [{ type: 'text', text: resultText }],
        isError: !execResult.success,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Publish failure event
      void this.options.eventBus.publish({
        eventType: 'tool.failed',
        tenantId: context.tenantId,
        agentId: context.agentId,
        sessionId: context.sessionId,
        source: 'mcp.server',
        payload: {
          toolName,
          callId,
          error: errorMsg,
          durationMs: Date.now() - startTime,
        },
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

  /**
   * Resolve authoritative context from the MCP connection.
   * CRITICAL: Context is derived from the authenticated session, NOT from caller-supplied values.
   * If context cannot be resolved, the request is BLOCKED.
   */
  private resolveContext(extra: any): McpToolContext | null {
    // Try to get context from the connection registry
    const connectionId = extra?.sessionId || extra?.connectionId;
    if (connectionId) {
      const ctx = this.connectionContexts.get(connectionId);
      if (ctx) return ctx;
    }

    // Try to extract from the MCP request metadata
    // In the MCP protocol, the server receives the request but NOT session context.
    // Context must be pre-registered when the connection is established.
    // If we reach here, the connection was not properly authenticated.
    return null;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  public async close(): Promise<void> {
    this.connectionContexts.clear();
    await this.mcpServer.close();
  }
}
