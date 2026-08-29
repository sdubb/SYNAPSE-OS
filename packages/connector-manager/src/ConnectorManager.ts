import {
  ConnectorType,
  IConnectorAdapter,
  IncomingConnectorMessage,
  OutboundMessagePayload,
  OutboundMessageResult,
} from './ConnectorAdapter.js';
import { ConnectorRegistry, ConnectorInstance, RegisterConnectorInput } from './ConnectorRegistry.js';
import { ConnectorPolicyEvaluator } from './ConnectorPolicy.js';
import { SlackConnectorAdapter } from './adapters/slack.js';
import { DiscordConnectorAdapter } from './adapters/discord.js';
import { TelegramConnectorAdapter } from './adapters/telegram.js';
import { LinearConnectorAdapter } from './adapters/linear.js';
import { GitHubConnectorAdapter } from './adapters/github.js';
import { GenericWebhookAdapter } from './adapters/webhook.js';

export interface ConnectorWebhookResult {
  accepted: boolean;
  message?: IncomingConnectorMessage;
  reason?: string;
  statusCode: number;
}

export type MessageDispatchHandler = (
  message: IncomingConnectorMessage
) => Promise<{ handled: boolean; replyText?: string }>;

export class ConnectorManager {
  private readonly registry: ConnectorRegistry;
  private readonly policy: ConnectorPolicyEvaluator;
  private readonly adapters = new Map<ConnectorType, IConnectorAdapter>();
  private dispatchHandler?: MessageDispatchHandler;

  constructor(options: { registry?: ConnectorRegistry; handler?: MessageDispatchHandler } = {}) {
    this.registry = options.registry ?? new ConnectorRegistry();
    this.policy = new ConnectorPolicyEvaluator();
    this.dispatchHandler = options.handler;

    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters(): void {
    this.adapters.set('slack', new SlackConnectorAdapter());
    this.adapters.set('discord', new DiscordConnectorAdapter());
    this.adapters.set('telegram', new TelegramConnectorAdapter());
    this.adapters.set('linear', new LinearConnectorAdapter());
    this.adapters.set('github', new GitHubConnectorAdapter());
    this.adapters.set('webhook', new GenericWebhookAdapter());
  }

  public registerAdapter(type: ConnectorType, adapter: IConnectorAdapter): void {
    this.adapters.set(type, adapter);
  }

  public getAdapter(type: ConnectorType): IConnectorAdapter | undefined {
    return this.adapters.get(type);
  }

  public registerConnector(input: RegisterConnectorInput): ConnectorInstance {
    return this.registry.register(input);
  }

  public getConnector(id: string): ConnectorInstance | null {
    return this.registry.getById(id);
  }

  public listConnectors(tenantId: string): ConnectorInstance[] {
    return this.registry.listByTenant(tenantId);
  }

  public setDispatchHandler(handler: MessageDispatchHandler): void {
    this.dispatchHandler = handler;
  }

  /**
   * Processes an incoming webhook request from any external messaging provider.
   */
  public async handleWebhook(
    connectorId: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
    rawBody: string
  ): Promise<ConnectorWebhookResult> {
    const connector = this.registry.getById(connectorId);
    if (!connector) {
      return { accepted: false, reason: `Connector ${connectorId} not found.`, statusCode: 404 };
    }

    if (!connector.enabled || connector.status === 'PAUSED') {
      return { accepted: false, reason: `Connector ${connectorId} is disabled or paused.`, statusCode: 403 };
    }

    const adapter = this.adapters.get(connector.type);
    if (!adapter) {
      return { accepted: false, reason: `No adapter found for type ${connector.type}.`, statusCode: 500 };
    }

    // 1. Verify Authentication / Webhook Signature
    if (connector.webhookSecret) {
      const isValid = adapter.verifyWebhook(headers, rawBody, connector.webhookSecret);
      if (!isValid) {
        this.registry.updateStatus(connectorId, 'ERRORED', 'Invalid webhook signature');
        return { accepted: false, reason: 'Invalid webhook signature.', statusCode: 401 };
      }
    }

    // 2. Parse Incoming Payload into Unified Synapse Connector Message
    const parsedMessage = adapter.parseIncomingWebhook(
      headers,
      body,
      rawBody,
      connectorId,
      connector.tenantId
    );

    if (!parsedMessage) {
      // E.g. URL verification or ping events acknowledged successfully
      return { accepted: true, statusCode: 200 };
    }

    // 3. Apply Connector Governance Policy
    const policyResult = this.policy.evaluate(parsedMessage, connector.policyRules);
    if (!policyResult.allowed) {
      return { accepted: false, reason: policyResult.reason, statusCode: 403 };
    }

    // 4. Dispatch to Synapse Event Pipeline / Control Plane
    if (this.dispatchHandler) {
      try {
        const dispatchRes = await this.dispatchHandler(parsedMessage);

        if (dispatchRes.replyText && parsedMessage.channelId) {
          // Automatic reply if provided
          await adapter.sendMessage(
            { channelId: parsedMessage.channelId, threadId: parsedMessage.threadId },
            { channelId: parsedMessage.channelId, text: dispatchRes.replyText },
            connector.credentials
          );
        }
      } catch (dispatchErr) {
        const errStr = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
        this.registry.updateStatus(connectorId, 'ERRORED', errStr);
        return { accepted: false, reason: `Dispatch failure: ${errStr}`, statusCode: 500 };
      }
    }

    this.registry.updateStatus(connectorId, 'ACTIVE');
    return { accepted: true, message: parsedMessage, statusCode: 200 };
  }

  /**
   * Sends an outbound message through a registered connector.
   */
  public async sendMessage(
    connectorId: string,
    destination: { channelId: string; threadId?: string },
    payload: OutboundMessagePayload
  ): Promise<OutboundMessageResult> {
    const connector = this.registry.getById(connectorId);
    if (!connector) {
      return {
        success: false,
        error: `Connector ${connectorId} not found.`,
        sentAt: new Date().toISOString(),
      };
    }

    const adapter = this.adapters.get(connector.type);
    if (!adapter) {
      return {
        success: false,
        error: `No adapter found for type ${connector.type}.`,
        sentAt: new Date().toISOString(),
      };
    }

    return adapter.sendMessage(destination, payload, connector.credentials);
  }

  public getRegistry(): ConnectorRegistry {
    return this.registry;
  }
}
