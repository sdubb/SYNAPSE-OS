/**
 * @file SynapseMcpBridge.ts
 * @description Bridges the SYNAPSE MCP Server to ClineEngine, connecting governed
 * capabilities to the existing ToolGateway governance pipeline.
 *
 * This bridge:
 * 1. Creates the SynapseMcpServer with proper governance callbacks
 * 2. Registers MCP server with Cline's MCP infrastructure
 * 3. Manages connection lifecycle and context propagation
 * 4. Ensures every MCP invocation goes through ToolGateway
 *
 * CRITICAL: This bridge does NOT bypass governance.
 * It connects MCP transport → ToolGateway governance → execution.
 */

import { SynapseMcpServer, type SynapseMcpServerOptions, type McpToolContext } from './SynapseMcpServer.js';
import type { ToolGateway } from '@synapse/tool-gateway';
import type { AuditEngine } from '@synapse/audit-engine';
import type { EventBus } from '@synapse/event-bus';
import type { ExecutionGraphEngine } from '@synapse/control-plane';

// ============================================================
// TYPES
// ============================================================

export interface SynapseMcpBridgeOptions {
  toolGateway: ToolGateway;
  auditEngine: AuditEngine;
  eventBus: EventBus;
  graphEngine?: ExecutionGraphEngine;
  defaultWorkspaceRoot?: string;
}

export interface McpConnectionRegistration {
  connectionId: string;
  context: McpToolContext;
  registeredAt: Date;
}

// ============================================================
// SYNAPSE MCP BRIDGE
// ============================================================

export class SynapseMcpBridge {
  public readonly mcpServer: SynapseMcpServer;
  private readonly options: SynapseMcpBridgeOptions;
  private readonly registrations = new Map<string, McpConnectionRegistration>();

  constructor(options: SynapseMcpBridgeOptions) {
    this.options = options;
    this.mcpServer = new SynapseMcpServer({
      toolGateway: options.toolGateway,
      auditEngine: options.auditEngine,
      eventBus: options.eventBus,
      graphEngine: options.graphEngine,
      defaultWorkspaceRoot: options.defaultWorkspaceRoot,
    });
  }

  // ============================================================
  // CONNECTION REGISTRATION
  // ============================================================

  /**
   * Register an authenticated MCP connection with authoritative context.
   *
   * CRITICAL: Context MUST be derived from authenticated session state.
   * The caller (ClineEngine) is responsible for ensuring:
   * - tenantId comes from authenticated session, not caller-supplied
   * - agentId comes from authenticated session, not caller-supplied
   * - All correlation IDs are validated against the session store
   *
   * @param connectionId - Unique connection identifier
   * @param context - Authoritative context derived from authenticated session
   */
  public registerConnection(connectionId: string, context: McpToolContext): void {
    // Validate that context contains authoritative identities
    if (!context.tenantId || !context.agentId || !context.sessionId) {
      throw new Error(
        'BLOCKED: Cannot register MCP connection without authoritative context. ' +
        'tenantId, agentId, and sessionId must be derived from authenticated session.'
      );
    }

    this.mcpServer.registerConnectionContext(connectionId, context);

    this.registrations.set(connectionId, {
      connectionId,
      context,
      registeredAt: new Date(),
    });

    // Audit the connection registration
    void this.options.auditEngine.logSecurityEvent({
      tenantId: context.tenantId,
      actor: { id: context.agentId, type: 'AGENT' as const, tenantId: context.tenantId },
      eventType: 'mcp.connection.registered',
      severity: 'INFO' as const,
      targetId: connectionId,
      targetType: 'CONNECTION' as const,
      details: {
        connectionId,
        sessionId: context.sessionId,
        missionId: context.missionId,
      },
    });

    // Publish connection event
    void this.options.eventBus.publish({
      eventType: 'agent.connected',
      tenantId: context.tenantId,
      agentId: context.agentId,
      sessionId: context.sessionId,
      source: 'mcp.bridge',
      payload: {
        connectionId,
        protocol: 'MCP',
        missionId: context.missionId,
      },
    });
  }

  /**
   * Unregister an MCP connection and clean up context.
   */
  public unregisterConnection(connectionId: string): void {
    const registration = this.registrations.get(connectionId);
    if (registration) {
      this.mcpServer.removeConnectionContext(connectionId);

      // Audit the disconnection
      void this.options.auditEngine.logSecurityEvent({
        tenantId: registration.context.tenantId,
        actor: { id: registration.context.agentId, type: 'AGENT' as const, tenantId: registration.context.tenantId },
        eventType: 'mcp.connection.unregistered',
        severity: 'INFO' as const,
        targetId: connectionId,
        targetType: 'CONNECTION' as const,
        details: {
          connectionId,
          sessionId: registration.context.sessionId,
          durationMs: Date.now() - registration.registeredAt.getTime(),
        },
      });

      // Publish disconnection event
      void this.options.eventBus.publish({
        eventType: 'agent.disconnected',
        tenantId: registration.context.tenantId,
        agentId: registration.context.agentId,
        sessionId: registration.context.sessionId,
        source: 'mcp.bridge',
        payload: {
          connectionId,
          durationMs: Date.now() - registration.registeredAt.getTime(),
        },
      });

      this.registrations.delete(connectionId);
    }
  }

  /**
   * Get all active MCP connections for a tenant.
   */
  public getConnections(tenantId: string): McpConnectionRegistration[] {
    return Array.from(this.registrations.values())
      .filter(r => r.context.tenantId === tenantId);
  }

  /**
   * Get the MCP server instance for transport connection.
   */
  public getMcpServer(): SynapseMcpServer {
    return this.mcpServer;
  }

  /**
   * Close the bridge and all connections.
   */
  public async close(): Promise<void> {
    // Unregister all connections
    for (const connectionId of this.registrations.keys()) {
      this.unregisterConnection(connectionId);
    }
    await this.mcpServer.close();
  }
}
