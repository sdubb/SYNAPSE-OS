export type ConnectorType =
  | 'slack'
  | 'discord'
  | 'telegram'
  | 'linear'
  | 'github'
  | 'webhook';

export interface IncomingConnectorMessage {
  connectorId: string;
  connectorType: ConnectorType;
  tenantId: string;
  senderId: string;
  senderName?: string;
  channelId?: string;
  threadId?: string;
  content: string;
  rawPayload: Record<string, unknown>;
  timestamp: string;
  command?: string;
  commandArgs?: string[];
}

export interface OutboundMessagePayload {
  channelId: string;
  threadId?: string;
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface OutboundMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt: string;
}

export interface IConnectorAdapter {
  readonly type: ConnectorType;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  verifyWebhook(headers: Record<string, string>, rawBody: string, secret: string): boolean;
  parseIncomingWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown>,
    rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null;
  sendMessage(
    destination: { channelId: string; threadId?: string },
    payload: OutboundMessagePayload,
    credentials: Record<string, string>
  ): Promise<OutboundMessageResult>;
}
