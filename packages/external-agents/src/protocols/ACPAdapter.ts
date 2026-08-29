import {
  IAgentAdapter,
  ExternalProtocol,
  ExternalToolCallProposal,
} from '../AgentAdapter.js';

export interface ACPMessageEnvelope {
  protocolVersion: '1.0';
  messageId: string;
  sender: string;
  recipient: string;
  conversationId: string;
  intent: 'DELEGATE_TASK' | 'QUERY_CAPABILITY' | 'REPORT_STATUS' | 'PROPOSE_TOOL';
  content: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export class ACPAdapter implements IAgentAdapter {
  public readonly protocol: ExternalProtocol = 'ACP';
  private endpoint = '';
  private credentials: Record<string, string> = {};

  public async initialize(
    endpoint: string,
    credentials: Record<string, string> = {}
  ): Promise<void> {
    this.endpoint = endpoint;
    this.credentials = credentials;
  }

  public async startSession(
    sessionId: string,
    systemPrompt: string,
    initialMessage: string
  ): Promise<{ externalSessionId: string }> {
    const envelope: ACPMessageEnvelope = {
      protocolVersion: '1.0',
      messageId: `acp_msg_${Date.now()}`,
      sender: 'synapse-os',
      recipient: 'external-agent',
      conversationId: sessionId,
      intent: 'DELEGATE_TASK',
      content: initialMessage,
      data: { systemPrompt },
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${this.endpoint}/acp/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      throw new Error(`ACP startSession failed: ${res.statusText}`);
    }

    return { externalSessionId: sessionId };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.credentials.apiKey || this.credentials.token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  public async sendMessage(
    externalSessionId: string,
    message: string
  ): Promise<{ responseText: string; toolProposals: ExternalToolCallProposal[] }> {
    const envelope: ACPMessageEnvelope = {
      protocolVersion: '1.0',
      messageId: `acp_msg_${Date.now()}`,
      sender: 'synapse-os',
      recipient: 'external-agent',
      conversationId: externalSessionId,
      intent: 'DELEGATE_TASK',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${this.endpoint}/acp/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      throw new Error(`ACP sendMessage failed: ${res.statusText}`);
    }

    const reply = (await res.json()) as ACPMessageEnvelope;
    const toolProposals: ExternalToolCallProposal[] = Array.isArray(reply.data?.toolProposals)
      ? (reply.data.toolProposals as ExternalToolCallProposal[])
      : [];

    return {
      responseText: reply.content || '',
      toolProposals,
    };
  }

  public async abortSession(_externalSessionId: string): Promise<void> {}

  public async healthCheck(
    endpoint: string,
    _credentials?: Record<string, string>
  ): Promise<boolean> {
    try {
      const res = await fetch(`${endpoint}/acp/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
