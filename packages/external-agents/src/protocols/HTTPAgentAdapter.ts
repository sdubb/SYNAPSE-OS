import {
  IAgentAdapter,
  ExternalProtocol,
  ExternalToolCallProposal,
} from '../AgentAdapter.js';

export class HTTPAgentAdapter implements IAgentAdapter {
  public readonly protocol: ExternalProtocol = 'HTTP';
  private endpoint = '';
  private credentials: Record<string, string> = {};

  public async initialize(
    endpoint: string,
    credentials: Record<string, string> = {}
  ): Promise<void> {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.credentials = credentials;
  }

  public async startSession(
    sessionId: string,
    systemPrompt: string,
    initialMessage: string,
    options: Record<string, unknown> = {}
  ): Promise<{ externalSessionId: string }> {
    const url = `${this.endpoint}/sessions`;
    const headers = this.getHeaders();

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        synapseSessionId: sessionId,
        systemPrompt,
        message: initialMessage,
        options,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP agent startSession failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { sessionId?: string; id?: string };
    const externalSessionId = data.sessionId || data.id || sessionId;
    return { externalSessionId };
  }

  public async sendMessage(
    externalSessionId: string,
    message: string
  ): Promise<{ responseText: string; toolProposals: ExternalToolCallProposal[] }> {
    const url = `${this.endpoint}/sessions/${externalSessionId}/messages`;
    const headers = this.getHeaders();

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      throw new Error(`HTTP agent sendMessage failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      text?: string;
      response?: string;
      tool_calls?: ExternalToolCallProposal[];
      toolProposals?: ExternalToolCallProposal[];
    };

    return {
      responseText: data.text || data.response || '',
      toolProposals: data.toolProposals || data.tool_calls || [],
    };
  }

  public async abortSession(externalSessionId: string): Promise<void> {
    const url = `${this.endpoint}/sessions/${externalSessionId}/abort`;
    const headers = this.getHeaders();

    await fetch(url, {
      method: 'POST',
      headers,
    }).catch(() => {});
  }

  public async healthCheck(
    endpoint: string,
    credentials: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      const ep = (endpoint || this.endpoint).replace(/\/$/, '');
      const token = credentials.apiKey || credentials.token || this.credentials.apiKey;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${ep}/health`, { method: 'GET', headers });
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
