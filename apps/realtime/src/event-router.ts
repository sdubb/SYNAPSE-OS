import { SynapseEventEnvelope } from '@synapse/event-bus';
import { ConnectionManager } from './connection-manager.js';
import { SubscriptionManager } from './subscription-manager.js';

export class EventRouter {
  private readonly connections: ConnectionManager;
  private readonly subscriptions: SubscriptionManager;

  constructor(connections: ConnectionManager, subscriptions: SubscriptionManager) {
    this.connections = connections;
    this.subscriptions = subscriptions;
  }

  /**
   * Routes an incoming event from EventBus to matching WebSocket clients.
   */
  public routeEvent(event: SynapseEventEnvelope): void {
    const candidateChannels = new Set<string>();

    // 1. Tenant-wide channel
    candidateChannels.add(`tenant:${event.tenantId}`);

    // 2. Resource-specific channels
    if (event.agentId) candidateChannels.add(`agent:${event.agentId}`);
    if (event.sessionId) candidateChannels.add(`session:${event.sessionId}`);
    if (event.taskId) candidateChannels.add(`task:${event.taskId}`);

    // 3. Category-specific channels
    if (event.eventType.startsWith('approval.')) {
      candidateChannels.add(`approvals:${event.tenantId}`);
    }
    if (event.eventType.startsWith('telemetry.')) {
      candidateChannels.add(`telemetry:${event.tenantId}`);
    }

    // Collect all unique client connection IDs subscribed to any of the candidate channels
    const targetConnectionIds = new Set<string>();
    for (const ch of candidateChannels) {
      const subs = this.subscriptions.getSubscribersForChannel(ch);
      for (const id of subs) {
        targetConnectionIds.add(id);
      }
    }

    if (targetConnectionIds.size === 0) {
      return;
    }

    const payload = JSON.stringify({
      type: 'EVENT',
      data: event,
      timestamp: new Date().toISOString(),
    });

    for (const connId of targetConnectionIds) {
      const client = this.connections.getClient(connId);
      if (!client || client.tenantId !== event.tenantId) {
        // Enforce tenant boundary safety check
        continue;
      }

      try {
        if (client.socket.readyState === 1) { // WebSocket.OPEN
          client.socket.send(payload);
        }
      } catch (sendErr) {
        console.error(`Failed to send event to client ${connId}:`, sendErr);
      }
    }
  }
}
