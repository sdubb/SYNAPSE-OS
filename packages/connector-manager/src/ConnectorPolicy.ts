import { IncomingConnectorMessage } from './ConnectorAdapter.js';

export interface ConnectorPolicyRules {
  allowedChannels?: string[];
  blockedChannels?: string[];
  allowedUsers?: string[];
  blockedUsers?: string[];
  allowedCommands?: string[];
  maxMessageLengthBytes?: number;
  rateLimitPerMinute?: number;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

export class ConnectorPolicyEvaluator {
  private userMessageHistory = new Map<string, number[]>();

  public evaluate(
    message: IncomingConnectorMessage,
    rules?: ConnectorPolicyRules
  ): PolicyCheckResult {
    if (!rules) {
      return { allowed: true };
    }

    // 1. Channel restrictions
    if (message.channelId) {
      if (rules.blockedChannels && rules.blockedChannels.includes(message.channelId)) {
        return { allowed: false, reason: `Channel ${message.channelId} is blocked by policy.` };
      }
      if (
        rules.allowedChannels &&
        rules.allowedChannels.length > 0 &&
        !rules.allowedChannels.includes(message.channelId)
      ) {
        return { allowed: false, reason: `Channel ${message.channelId} is not in the allowed channels list.` };
      }
    }

    // 2. User restrictions
    if (message.senderId) {
      if (rules.blockedUsers && rules.blockedUsers.includes(message.senderId)) {
        return { allowed: false, reason: `Sender ${message.senderId} is blocked by policy.` };
      }
      if (
        rules.allowedUsers &&
        rules.allowedUsers.length > 0 &&
        !rules.allowedUsers.includes(message.senderId)
      ) {
        return { allowed: false, reason: `Sender ${message.senderId} is not authorized for this connector.` };
      }
    }

    // 3. Command whitelist
    if (message.command && rules.allowedCommands && rules.allowedCommands.length > 0) {
      const normalizedCmd = message.command.toLowerCase();
      const isAllowed = rules.allowedCommands.some(
        (cmd) => cmd.toLowerCase() === normalizedCmd
      );
      if (!isAllowed) {
        return { allowed: false, reason: `Command ${message.command} is not whitelisted.` };
      }
    }

    // 4. Message length limit
    const maxLen = rules.maxMessageLengthBytes ?? 65536; // 64KB default
    if (Buffer.byteLength(message.content, 'utf8') > maxLen) {
      return { allowed: false, reason: `Message exceeds maximum allowed size of ${maxLen} bytes.` };
    }

    // 5. Rate limit per sender
    if (rules.rateLimitPerMinute && rules.rateLimitPerMinute > 0) {
      const key = `${message.connectorId}:${message.senderId}`;
      const now = Date.now();
      const windowStart = now - 60000;

      const timestamps = this.userMessageHistory.get(key) ?? [];
      const validTimestamps = timestamps.filter((ts) => ts >= windowStart);

      if (validTimestamps.length >= rules.rateLimitPerMinute) {
        return { allowed: false, reason: `Rate limit exceeded (${rules.rateLimitPerMinute} messages/min).` };
      }

      validTimestamps.push(now);
      this.userMessageHistory.set(key, validTimestamps);
    }

    return { allowed: true };
  }
}
