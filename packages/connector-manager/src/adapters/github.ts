import {
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from '../ConnectorAdapter.js';
import { ConnectorAuth } from '../ConnectorAuth.js';

export class GitHubConnectorAdapter implements IConnectorAdapter {
  public readonly type = 'github';

  public verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
    secret: string
  ): boolean {
    const signature =
      headers['x-hub-signature-256'] ||
      headers['X-Hub-Signature-256'] ||
      '';
    if (!signature) return false;
    return ConnectorAuth.verifyGitHubSignature(secret, signature, rawBody);
  }

  public parseIncomingWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown>,
    _rawBody: string,
    connectorId: string,
    tenantId: string
  ): IncomingConnectorMessage | null {
    const eventType =
      headers['x-github-event'] ||
      headers['X-GitHub-Event'] ||
      'unknown';
    const action = String(body.action || '');

    const sender = (body.sender as Record<string, unknown>) || {};
    const repository = (body.repository as Record<string, unknown>) || {};
    const issue = (body.issue as Record<string, unknown>) || {};
    const pullRequest = (body.pull_request as Record<string, unknown>) || {};
    const comment = (body.comment as Record<string, unknown>) || {};

    const senderId = String(sender.login || sender.id || 'github_user');
    const repoFullName = String(repository.full_name || '');
    const issueNumber = issue.number || pullRequest.number;

    let content = '';
    if (comment.body) {
      content = String(comment.body);
    } else if (pullRequest.body || pullRequest.title) {
      content = `[PR #${pullRequest.number}] ${pullRequest.title}\n${pullRequest.body || ''}`;
    } else if (issue.body || issue.title) {
      content = `[Issue #${issue.number}] ${issue.title}\n${issue.body || ''}`;
    } else {
      content = `[GitHub ${eventType}:${action}] in ${repoFullName}`;
    }

    return {
      connectorId,
      connectorType: 'github',
      tenantId,
      senderId,
      senderName: senderId,
      channelId: repoFullName,
      threadId: issueNumber ? String(issueNumber) : undefined,
      content,
      command: `${eventType}.${action}`,
      rawPayload: body,
      timestamp: new Date().toISOString(),
    };
  }

  public async sendMessage(
    destination: { channelId: string; threadId?: string },
    payload: OutboundMessagePayload,
    credentials: Record<string, string>
  ): Promise<OutboundMessageResult> {
    const token = credentials.token || credentials.apiKey;
    if (!token) {
      return {
        success: false,
        error: 'Missing GitHub Access Token',
        sentAt: new Date().toISOString(),
      };
    }

    try {
      const repo = destination.channelId; // format: "owner/repo"
      const issueNumber = destination.threadId;

      if (!issueNumber) {
        return {
          success: false,
          error: 'Missing GitHub issue/PR number in threadId',
          sentAt: new Date().toISOString(),
        };
      }

      const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Synapse-OS-Connector',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ body: payload.text }),
      });

      const data = (await res.json()) as { id?: number; message?: string };

      return {
        success: res.ok,
        messageId: data.id ? String(data.id) : undefined,
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
