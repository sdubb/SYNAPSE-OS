import {
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from '../ConnectorAdapter.js';
import { ConnectorAuth } from '../ConnectorAuth.js';

export class SlackConnectorAdapter implements IConnectorAdapter {
  public readonly type = 'slack';

  public verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
    secret: string
  ): boolean {
    const signature = headers['x-slack-signature'] || headers['X-Slack-Signature'] || '';
    const timestamp = headers['x-slack-request-timestamp'] || headers['X-Slack-Request-Timestamp'] || '';

    if (!signature || !timestamp) return false;
    return ConnectorAuth.verifySlackSignature(secret, signature, timestamp, rawBody);
  }

  public parseIncomingWebhook(
    _headers: Record<string, string>,
    body: Record<string, unknown>,
    _rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null {
    // URL verification challenge from Slack
    if (body.type === 'url_verification') {
      return null;
    }

    const event = (body.event as Record<string, unknown>) || body;
    const senderId = String(event.user || event.user_id || 'slack_user');
    const channelId = String(event.channel || event.channel_id || '');
    const threadId = event.thread_ts ? String(event.thread_ts) : undefined;
    const text = String(event.text || '');

    // Check for slash command or bot mention prefix
    let command: string | undefined;
    let commandArgs: string[] | undefined;

    if (text.startsWith('/')) {
      const parts = text.slice(1).trim().split(/\s+/);
      command = parts[0];
      commandArgs = parts.slice(1);
    }

    return {
      connectorId,
      connectorType: 'slack',
      tenantId,
      senderId,
      senderName: String(event.username || senderId),
      channelId,
      threadId,
      content: text,
      command,
      commandArgs,
      rawPayload: body,
      timestamp: new Date().toISOString(),
    };
  }

  public async sendMessage(
    destination: { channelId: string; threadId?: string },
    payload: OutboundMessagePayload,
    credentials: Record<string, string>
  ): Promise<OutboundMessageResult> {
    const botToken = credentials.botToken || credentials.token;
    if (!botToken) {
      return {
        success: false,
        error: 'Missing Slack Bot Token',
        sentAt: new Date().toISOString(),
      };
    }

    try {
      const body = {
        channel: destination.channelId,
        thread_ts: destination.threadId,
        text: payload.text,
        blocks: payload.blocks,
      };

      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { ok: boolean; ts?: string; error?: string };

      return {
        success: data.ok,
        messageId: data.ts,
        error: data.error,
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
