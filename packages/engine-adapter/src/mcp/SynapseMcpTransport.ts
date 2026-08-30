/**
 * @file SynapseMcpTransport.ts
 * @description Exposes SynapseMcpServer through Streamable HTTP transport.
 * Uses @modelcontextprotocol/sdk's StreamableHTTPServerTransport.
 *
 * Every MCP connection is authenticated and assigned authoritative context.
 * No unauthenticated connections.
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

// ============================================================
// SYNAPSE MCP TRANSPORT
// ============================================================

export class SynapseMcpTransport {
  private readonly mcpServer: SynapseMcpServer;
  private readonly resolveAuthContext: (req: IncomingMessage) => Promise<McpToolContext | null>;
  /** Session ID → transport mapping for stateful connections */
  private readonly sessions = new Map<string, StreamableHTTPServerTransport>();

  constructor(options: McpTransportOptions) {
    this.mcpServer = options.mcpServer;
    this.resolveAuthContext = options.resolveAuthContext;
  }

  /**
   * Handle an MCP HTTP request.
   *
   * Flow:
   * 1. Authenticate the request → resolve authoritative context
   * 2. Create/connect StreamableHTTPServerTransport
   * 3. Route to SynapseMcpServer
   * 4. Return MCP JSON-RPC response
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
      let transport = this.sessions.get(sessionId);

      if (!transport) {
        // Create new stateful transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
        });

        // Connect transport to MCP server
        await this.mcpServer.mcpServer.connect(transport);

        // Register connection context
        this.mcpServer.registerConnectionContext(sessionId, {
          ...authContext,
          callId: randomUUID(),
        });

        this.sessions.set(sessionId, transport);

        // Set session cookie for subsequent requests
        res.setHeader('Mcp-Session-Id', sessionId);
      }

      // 3. Handle the request through the transport
      const parsedBody = body || await this.parseBody(req);
      await transport.handleRequest(req, res, parsedBody);
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
    const transport = this.sessions.get(sessionId);
    if (transport) {
      await transport.close().catch(() => {});
      this.mcpServer.removeConnectionContext(sessionId);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Close all sessions.
   */
  public async closeAll(): Promise<void> {
    for (const [sessionId, transport] of this.sessions) {
      await transport.close().catch(() => {});
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
    // Check Mcp-Session-Id header
    const header = req.headers['mcp-session-id'];
    if (typeof header === 'string') return header;

    // Check URL query parameter
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
