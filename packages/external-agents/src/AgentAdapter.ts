export type ExternalProtocol = 'HTTP' | 'WEBSOCKET' | 'MCP' | 'ACP';

export interface ExternalToolCallProposal {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rationale?: string;
}

export interface ExternalToolCallDecision {
  allowed: boolean;
  modifiedParameters?: Record<string, unknown>;
  reason?: string;
  requiresHumanApproval?: boolean;
}

export interface ExternalStepTelemetry {
  stepIndex: number;
  thought?: string;
  tokensUsed?: number;
  toolCalls?: ExternalToolCallProposal[];
  timestamp: string;
}

export interface IAgentAdapter {
  readonly protocol: ExternalProtocol;
  initialize(endpoint: string, credentials?: Record<string, string>): Promise<void>;
  startSession(
    sessionId: string,
    systemPrompt: string,
    initialMessage: string,
    options?: Record<string, unknown>
  ): Promise<{ externalSessionId: string }>;
  sendMessage(
    externalSessionId: string,
    message: string
  ): Promise<{ responseText: string; toolProposals: ExternalToolCallProposal[] }>;
  abortSession(externalSessionId: string): Promise<void>;
  healthCheck(endpoint: string, credentials?: Record<string, string>): Promise<boolean>;
}
