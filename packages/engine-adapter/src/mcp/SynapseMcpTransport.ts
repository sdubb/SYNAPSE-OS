/**
 * @file SynapseMcpTransport.ts
 * @description Exposes SynapseMcpServer through Streamable HTTP transport.
 * Uses @modelcontextprotocol/sdk's StreamableHTTPServerTransport.
 *
 * Every MCP connection is authenticated and assigned authoritative context.
 * Supports concurrent multi-client connections with dedicated McpServer instances.
 */

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import type { SynapseMcpServer, McpToolContext } from './SynapseMcpServer.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// ============================================================
// TYPES
// ============================================================

export interface McpTransportOptions {
  mcpServer: SynapseMcpServer;
  /** Resolve authoritative context from an authenticated request */
  resolveAuthContext: (req: IncomingMessage) => Promise<McpToolContext | null>;
}

export interface McpTransportRoute {
  method: 'POST' | 'GET' | 'DELETE';
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

interface ActiveSession {
  transport: StreamableHTTPServerTransport;
  context: McpToolContext;
  serverInstance: any;
}

// ============================================================
// SYNAPSE MCP TRANSPORT
// ============================================================

export class SynapseMcpTransport {
  private readonly mcpServer: SynapseMcpServer;
  private readonly resolveAuthContext: (req: IncomingMessage) => Promise<McpToolContext | null>;
  /** Session ID → ActiveSession mapping for multi-client stateful connections */
  private readonly sessions = new Map<string, ActiveSession>();

  constructor(options: McpTransportOptions) {
    this.mcpServer = options.mcpServer;
    this.resolveAuthContext = options.resolveAuthContext;
  }

  /**
   * Handle an MCP HTTP request.
   *
   * Flow:
   * 1. Authenticate the request → resolve authoritative context
   * 2. Validate tenant consistency (fail closed against session fixation)
   * 3. Create/connect dedicated McpServer + StreamableHTTPServerTransport
   * 4. Route to McpServer
   * 5. Return MCP JSON-RPC response
   */
  public async handleRequest(req: IncomingMessage, res: ServerResponse, body?: unknown): Promise<void> {
    try {
      // 1. Resolve authentication context
      const authContext = await this.resolveAuthContext(req);
      if (!authContext) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: valid authentication token required' }));
        return;
      }

      // 2. Get or create transport for this session
      const sessionId = this.extractSessionId(req) || randomUUID();
      let activeSession = this.sessions.get(sessionId);

      if (!activeSession) {
        // Create new stateful transport
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
        });

        // Create dedicated server instance bound to this connection context
        const serverInstance = this.mcpServer.createDedicatedServer({
          ...authContext,
          sessionId,
          callId: randomUUID(),
        });

        // Connect dedicated server to this transport
        await serverInstance.connect(transport);

        // Register connection context in main server registry as well
        this.mcpServer.registerConnectionContext(sessionId, {
          ...authContext,
          sessionId,
          callId: randomUUID(),
        });

        activeSession = {
          transport,
          context: authContext,
          serverInstance,
        };

        this.sessions.set(sessionId, activeSession);

        // Set session header for subsequent requests
        res.setHeader('Mcp-Session-Id', sessionId);
      } else {
        // Session fixation / cross-tenant hijacking protection
        if (activeSession.context.tenantId !== authContext.tenantId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Cross-tenant session hijacking blocked' }));
          return;
        }
      }

      // 3. Handle the request through the transport
      const parsedBody = body || await this.parseBody(req);
      await activeSession.transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[SynapseMcpTransport] Error handling request:', errorMsg);

      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Internal error: ${errorMsg}` }));
      }
    }
  }

  /**
   * Handle session termination.
   */
  public async handleSessionClose(sessionId: string): Promise<void> {
    const active = this.sessions.get(sessionId);
    if (active) {
      await active.transport.close().catch(() => {});
      await active.serverInstance?.close().catch(() => {});
      this.mcpServer.removeConnectionContext(sessionId);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Close all sessions.
   */
  public async closeAll(): Promise<void> {
    for (const [sessionId, active] of this.sessions) {
      await active.transport.close().catch(() => {});
      await active.serverInstance?.close().catch(() => {});
      this.mcpServer.removeConnectionContext(sessionId);
    }
    this.sessions.clear();
  }

  /**
   * Get active session count.
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private extractSessionId(req: IncomingMessage): string | null {
    const header = req.headers['mcp-session-id'];
    if (typeof header === 'string') return header;

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    return url.searchParams.get('session_id');
  }

  private async parseBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf-8');
          resolve(raw ? JSON.parse(raw) : undefined);
        } catch (error) {
          reject(new Error(`Invalid JSON body: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
      req.on('error', reject);
    });
  }
}
