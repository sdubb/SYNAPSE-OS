import {
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from '../ConnectorAdapter.js';
import { ConnectorAuth } from '../ConnectorAuth.js';

export class TelegramConnectorAdapter implements IConnectorAdapter {
  public readonly type = 'telegram';

  public verifyWebhook(
    headers: Record<string, string>,
    _rawBody: string,
    secret: string
  ): boolean {
    const token =
      headers['x-telegram-bot-api-secret-token'] ||
      headers['X-Telegram-Bot-Api-Secret-Token'] ||
      '';
    return ConnectorAuth.verifyTelegramSecret(secret, token);
  }

  public parseIncomingWebhook(
    _headers: Record<string, string>,
    body: Record<string, unknown>,
    _rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null {
    const message =
      (body.message as Record<string, unknown>) ||
      (body.edited_message as Record<string, unknown>) ||
      (body.channel_post as Record<string, unknown>);

    if (!message) return null;

    const from = (message.from as Record<string, unknown>) || {};
    const chat = (message.chat as Record<string, unknown>) || {};
    const senderId = String(from.id || 'telegram_user');
    const senderName = String(from.username || from.first_name || senderId);
    const channelId = String(chat.id || '');
    const text = String(message.text || message.caption || '');

    let command: string | undefined;
    let commandArgs: string[] | undefined;

    if (text.startsWith('/')) {
      const parts = text.slice(1).trim().split(/\s+/);
      command = parts[0].split('@')[0]; // strip bot username if present: /cmd@bot
      commandArgs = parts.slice(1);
    }

    return {
      connectorId,
      connectorType: 'telegram',
      tenantId,
      senderId,
      senderName,
      channelId,
      threadId: message.message_thread_id ? String(message.message_thread_id) : undefined,
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
        error: 'Missing Telegram botToken',
        sentAt: new Date().toISOString(),
      };
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const body = {
        chat_id: destination.channelId,
        message_thread_id: destination.threadId ? parseInt(destination.threadId, 10) : undefined,
        text: payload.text,
        parse_mode: 'MarkdownV2',
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        ok: boolean;
        result?: { message_id: number };
        description?: string;
      };

      return {
        success: data.ok,
        messageId: data.result ? String(data.result.message_id) : undefined,
        error: data.description,
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
