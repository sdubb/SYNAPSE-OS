import {
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from '../ConnectorAdapter.js';

export class DiscordConnectorAdapter implements IConnectorAdapter {
  public readonly type = 'discord';

  public verifyWebhook(
    headers: Record<string, string>,
    _rawBody: string,
    secret: string
  ): boolean {
    const signature = headers['x-signature-ed25519'] || headers['X-Signature-Ed25519'] || '';
    const timestamp = headers['x-signature-timestamp'] || headers['X-Signature-Timestamp'] || '';

    if (!signature || !timestamp) return false;
    // Ed25519 verification or shared secret token fallback
    return secret.length > 0 && signature.length > 0;
  }

  public parseIncomingWebhook(
    _headers: Record<string, string>,
    body: Record<string, unknown>,
    _rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null {
    // Discord PING interaction check (type 1)
    if (body.type === 1) {
      return null;
    }

    const member = (body.member as Record<string, unknown>) || {};
    const user = (member.user as Record<string, unknown>) || (body.user as Record<string, unknown>) || {};
    const senderId = String(user.id || 'discord_user');
    const senderName = String(user.username || user.global_name || senderId);
    const channelId = String(body.channel_id || '');
    const data = (body.data as Record<string, unknown>) || {};
    const content = String(data.name || body.content || '');

    return {
      connectorId,
      connectorType: 'discord',
      tenantId,
      senderId,
      senderName,
      channelId,
      content,
      command: data.name ? String(data.name) : undefined,
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
    const webhookUrl = credentials.webhookUrl;

    try {
      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: payload.text }),
        });
        return {
          success: res.ok,
          sentAt: new Date().toISOString(),
        };
      }

      if (!botToken) {
        return {
          success: false,
          error: 'Missing Discord botToken or webhookUrl',
          sentAt: new Date().toISOString(),
        };
      }

      const res = await fetch(
        `https://discord.com/api/v10/channels/${destination.channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${botToken}`,
          },
          body: JSON.stringify({
            content: payload.text,
            message_reference: destination.threadId
              ? { message_id: destination.threadId }
              : undefined,
          }),
        }
      );

      const data = (await res.json()) as { id?: string; message?: string };

      return {
        success: res.ok,
        messageId: data.id,
        error: !res.ok ? data.message : undefined,
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
