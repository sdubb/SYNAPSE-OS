import {
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from '../ConnectorAdapter.js';
import { ConnectorAuth } from '../ConnectorAuth.js';

export class GenericWebhookAdapter implements IConnectorAdapter {
  public readonly type = 'webhook';

  public verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
    secret: string
  ): boolean {
    if (!secret) return true; // If no secret configured, open webhook

    const hmacSig =
      headers['x-synapse-signature'] ||
      headers['x-signature'] ||
      headers['x-hub-signature-256'] ||
      '';

    if (hmacSig) {
      return ConnectorAuth.verifyGenericHmac(secret, hmacSig, rawBody);
    }

    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      return ConnectorAuth.safeCompare(authHeader.slice(7).trim(), secret);
    }

    return false;
  }

  public parseIncomingWebhook(
    _headers: Record<string, string>,
    body: Record<string, unknown>,
    _rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null {
    const senderId = String(body.senderId || body.userId || body.sender || 'webhook_caller');
    const senderName = String(body.senderName || body.userName || senderId);
    const channelId = String(body.channelId || body.channel || 'default');
    const threadId = body.threadId ? String(body.threadId) : undefined;
    const content = String(body.content || body.message || body.text || JSON.stringify(body));

    return {
      connectorId,
      connectorType: 'webhook',
      tenantId,
      senderId,
      senderName,
      channelId,
      threadId,
      content,
      command: body.command ? String(body.command) : undefined,
      rawPayload: body,
      timestamp: new Date().toISOString(),
    };
  }

  public async sendMessage(
    destination: { channelId: string; threadId?: string },
    payload: OutboundMessagePayload,
    credentials: Record<string, string>
  ): Promise<OutboundMessageResult> {
    const targetUrl = credentials.targetUrl || credentials.webhookUrl || destination.channelId;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return {
        success: false,
        error: 'Invalid or missing target HTTP URL for outbound webhook',
        sentAt: new Date().toISOString(),
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (credentials.bearerToken) {
        headers['Authorization'] = `Bearer ${credentials.bearerToken}`;
      }

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channelId: destination.channelId,
          threadId: destination.threadId,
          text: payload.text,
          metadata: payload.metadata,
        }),
      });

      return {
        success: res.ok,
        error: !res.ok ? `HTTP ${res.status}: ${res.statusText}` : undefined,
        sentAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        sentAt: new Date().toISOString(),
      };
    }
  }
}
