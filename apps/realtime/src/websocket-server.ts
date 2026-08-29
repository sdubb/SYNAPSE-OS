import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { EventBus, SynapseEventEnvelope } from '@synapse/event-bus';
import { logger } from '@synapse/observability';
import { ConnectionManager, AuthValidator } from './connection-manager.js';
import { SubscriptionManager } from './subscription-manager.js';
import { EventRouter } from './event-router.js';

export interface SynapseRealtimeServerOptions {
  port?: number;
  eventBus?: EventBus;
  authValidator?: AuthValidator;
}

export class SynapseWebSocketServer {
  private wss: WSServer | null = null;
  private readonly port: number;
  private readonly eventBus: EventBus;
  private readonly connections: ConnectionManager;
  private readonly subscriptions: SubscriptionManager;
  private readonly router: EventRouter;

  constructor(options: SynapseRealtimeServerOptions = {}) {
    this.port = options.port ?? 8080;
    this.eventBus = options.eventBus ?? new EventBus();
    this.connections = new ConnectionManager(options.authValidator);
    this.subscriptions = new SubscriptionManager();
    this.router = new EventRouter(this.connections, this.subscriptions);

    // Subscribe to all EventBus events to route to connected clients
    this.eventBus.subscribe('*', (event: SynapseEventEnvelope) => {
      this.router.routeEvent(event);
    });
  }

  public async start(): Promise<void> {
    this.wss = new WSServer({ port: this.port });
    this.connections.startHeartbeat();

    this.wss.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
      const token = url.searchParams.get('token') ?? undefined;

      const client = await this.connections.authenticateConnection(socket, token);
      if (!client) {
        socket.close(4001, 'Authentication failed');
        return;
      }

      logger.info(`WebSocket client connected: ${client.connectionId} (Tenant: ${client.tenantId})`);

      // Auto-subscribe client to their tenant channel
      this.subscriptions.subscribe(client, `tenant:${client.tenantId}`);

      // Send welcome handshake
      socket.send(
        JSON.stringify({
          type: 'CONNECTED',
          connectionId: client.connectionId,
          tenantId: client.tenantId,
          userId: client.userId,
        })
      );

      socket.on('pong', () => {
        this.connections.handlePong(client.connectionId);
      });

      socket.on('message', (data: Buffer | string) => {
        try {
          const messageStr = typeof data === 'string' ? data : data.toString('utf8');
          const parsed = JSON.parse(messageStr) as {
            action: string;
            channel?: string;
            payload?: unknown;
          };

          if (parsed.action === 'SUBSCRIBE' && parsed.channel) {
            const res = this.subscriptions.subscribe(client, parsed.channel);
            socket.send(
              JSON.stringify({
                type: 'SUBSCRIPTION_ACK',
                channel: parsed.channel,
                success: res.success,
                error: res.error,
              })
            );
          } else if (parsed.action === 'UNSUBSCRIBE' && parsed.channel) {
            this.subscriptions.unsubscribe(client, parsed.channel);
            socket.send(
              JSON.stringify({
                type: 'UNSUBSCRIBE_ACK',
                channel: parsed.channel,
              })
            );
          } else if (parsed.action === 'PING') {
            socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch (err) {
          socket.send(
            JSON.stringify({
              type: 'ERROR',
              message: 'Invalid message format. Expected JSON.',
            })
          );
        }
      });

      socket.on('close', () => {
        this.subscriptions.removeClient(client);
        this.connections.removeConnection(client.connectionId);
        logger.info(`WebSocket client disconnected: ${client.connectionId}`);
      });

      socket.on('error', (err) => {
        logger.error(`WebSocket socket error for ${client.connectionId}:`, err);
      });
    });

    logger.info(`Synapse Realtime WebSocket Server listening on port ${this.port}`);
  }

  public async close(): Promise<void> {
    this.connections.stopHeartbeat();
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss?.close(() => resolve());
      });
      this.wss = null;
    }
  }

  public getStats(): { connectionsCount: number; channelsCount: number } {
    return {
      connectionsCount: this.connections.getCount(),
      channelsCount: this.subscriptions.getChannelCount(),
    };
  }
}
