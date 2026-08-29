import {
  IAgentAdapter,
  ExternalProtocol,
  ExternalToolCallProposal,
} from '../AgentAdapter.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class MCPAdapter implements IAgentAdapter {
  public readonly protocol: ExternalProtocol = 'MCP';
  private endpoint = '';
  private credentials: Record<string, string> = {};
  private tools: McpToolDefinition[] = [];

  public async initialize(
    endpoint: string,
    credentials: Record<string, string> = {}
  ): Promise<void> {
    this.endpoint = endpoint;
    this.credentials = credentials;
    await this.listTools();
  }

  public async listTools(): Promise<McpToolDefinition[]> {
    try {
      const res = await fetch(`${this.endpoint}/mcp/tools`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { tools: McpToolDefinition[] };
        this.tools = data.tools || [];
      }
    } catch {
      // Fallback empty toolset
      this.tools = [];
    }
    return this.tools;
  }

  public async startSession(
    sessionId: string,
    _systemPrompt: string,
    _initialMessage: string
  ): Promise<{ externalSessionId: string }> {
    return { externalSessionId: `mcp_${sessionId}` };
  }

  public async sendMessage(
    externalSessionId: string,
    message: string
  ): Promise<{ responseText: string; toolProposals: ExternalToolCallProposal[] }> {
    return {
      responseText: `[MCP Agent Response for ${externalSessionId}] Processed: ${message}`,
      toolProposals: [],
    };
  }

  public async callMcpTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ result: unknown; isError?: boolean }> {
    const res = await fetch(`${this.endpoint}/mcp/tools/call`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name: toolName, arguments: args }),
    });

    if (!res.ok) {
      throw new Error(`MCP tool call failed: ${res.statusText}`);
    }

    return (await res.json()) as { result: unknown; isError?: boolean };
  }

  public async abortSession(_externalSessionId: string): Promise<void> {}

  public async healthCheck(
    endpoint: string,
    credentials: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      const ep = (endpoint || this.endpoint).replace(/\/$/, '');
      const res = await fetch(`${ep}/mcp/ping`, {
        headers: {
          Authorization: `Bearer ${credentials.apiKey || this.credentials.apiKey || ''}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.credentials.apiKey || this.credentials.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
}
