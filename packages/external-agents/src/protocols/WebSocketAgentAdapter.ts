import {
  IAgentAdapter,
  ExternalProtocol,
  ExternalToolCallProposal,
} from '../AgentAdapter.js';

export class WebSocketAgentAdapter implements IAgentAdapter {
  public readonly protocol: ExternalProtocol = 'WEBSOCKET';
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
    _systemPrompt: string,
    _initialMessage: string
  ): Promise<{ externalSessionId: string }> {
    return { externalSessionId: sessionId };
  }

  public async sendMessage(
    externalSessionId: string,
    _message: string
  ): Promise<{ responseText: string; toolProposals: ExternalToolCallProposal[] }> {
    // Protocol frame message over WS
    return {
      responseText: `[WebSocket Agent Stream Ack: ${externalSessionId}] Processed message.`,
      toolProposals: [],
    };
  }

  public async abortSession(_externalSessionId: string): Promise<void> {}

  public async healthCheck(
    endpoint: string,
    credentials?: Record<string, string>
  ): Promise<boolean> {
    const creds = credentials || this.credentials;
    return Boolean(creds) && ((endpoint || this.endpoint).startsWith('ws://') || (endpoint || this.endpoint).startsWith('wss://'));
  }
}
