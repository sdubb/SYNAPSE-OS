import {
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from '../ConnectorAdapter.js';
import { ConnectorAuth } from '../ConnectorAuth.js';

export class LinearConnectorAdapter implements IConnectorAdapter {
  public readonly type = 'linear';

  public verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
    secret: string
  ): boolean {
    const signature =
      headers['linear-signature'] ||
      headers['Linear-Signature'] ||
      '';
    if (!signature) return false;
    return ConnectorAuth.verifyLinearSignature(secret, signature, rawBody);
  }

  public parseIncomingWebhook(
    _headers: Record<string, string>,
    body: Record<string, unknown>,
    _rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null {
    const action = String(body.action || '');
    const type = String(body.type || '');
    const data = (body.data as Record<string, unknown>) || {};
    const actor = (body.actor as Record<string, unknown>) || {};

    const senderId = String(actor.id || 'linear_user');
    const senderName = String(actor.name || senderId);
    const issueId = String(data.id || '');
    const title = String(data.title || '');
    const description = String(data.description || data.body || '');

    const content = `[Linear ${type}:${action}] ${title}\n${description}`.trim();

    return {
      connectorId,
      connectorType: 'linear',
      tenantId,
      senderId,
      senderName,
      channelId: String(data.teamId || ''),
      threadId: issueId,
      content,
      command: action,
      rawPayload: body,
      timestamp: new Date().toISOString(),
    };
  }

  public async sendMessage(
    destination: { channelId: string; threadId?: string },
    payload: OutboundMessagePayload,
    credentials: Record<string, string>
  ): Promise<OutboundMessageResult> {
    const apiKey = credentials.apiKey || credentials.token;
    if (!apiKey) {
      return {
        success: false,
        error: 'Missing Linear API Key',
        sentAt: new Date().toISOString(),
      };
    }

    try {
      // Linear GraphQL mutation: commentCreate
      const issueId = destination.threadId || destination.channelId;
      const query = `
        mutation CreateComment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
            comment {
              id
            }
          }
        }
      `;

      const res = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({
          query,
          variables: { issueId, body: payload.text },
        }),
      });

      const json = (await res.json()) as {
        data?: { commentCreate?: { success: boolean; comment?: { id: string } } };
        errors?: Array<{ message: string }>;
      };

      if (json.errors && json.errors.length > 0) {
        return {
          success: false,
          error: json.errors[0].message,
          sentAt: new Date().toISOString(),
        };
      }

      return {
        success: json.data?.commentCreate?.success ?? false,
        messageId: json.data?.commentCreate?.comment?.id,
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
