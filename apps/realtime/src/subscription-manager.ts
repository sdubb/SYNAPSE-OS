import { AuthenticatedClient } from './connection-manager.js';

export class SubscriptionManager {
  private channelSubscribers = new Map<string, Set<string>>(); // channel -> Set<connectionId>

  /**
   * Subscribes a client to a channel with strict tenant isolation guards.
   */
  public subscribe(client: AuthenticatedClient, channel: string): { success: boolean; error?: string } {
    // Tenant validation: if channel is tenant-specific, ensure client belongs to that tenant
    if (channel.startsWith('tenant:') || channel.startsWith('approvals:') || channel.startsWith('telemetry:')) {
      const channelTenant = channel.split(':')[1];
      if (channelTenant && channelTenant !== client.tenantId) {
        return { success: false, error: 'Unauthorized: Cross-tenant subscription denied.' };
      }
    }

    // Block wildcard cross-tenant subscriptions for non-admin clients
    if (channel.includes('*') && !client.roles.includes('admin') && !client.roles.includes('system')) {
      return { success: false, error: 'Unauthorized: Wildcard subscriptions restricted to administrators.' };
    }

    client.subscriptions.add(channel);

    let subs = this.channelSubscribers.get(channel);
    if (!subs) {
      subs = new Set<string>();
      this.channelSubscribers.set(channel, subs);
    }
    subs.add(client.connectionId);

    return { success: true };
  }

  public unsubscribe(client: AuthenticatedClient, channel: string): void {
    client.subscriptions.delete(channel);
    const subs = this.channelSubscribers.get(channel);
    if (subs) {
      subs.delete(client.connectionId);
      if (subs.size === 0) {
        this.channelSubscribers.delete(channel);
      }
    }
  }

  public removeClient(client: AuthenticatedClient): void {
    for (const channel of client.subscriptions) {
      const subs = this.channelSubscribers.get(channel);
      if (subs) {
        subs.delete(client.connectionId);
        if (subs.size === 0) {
          this.channelSubscribers.delete(channel);
        }
      }
    }
    client.subscriptions.clear();
  }

  public getSubscribersForChannel(channel: string): Set<string> {
    return this.channelSubscribers.get(channel) ?? new Set<string>();
  }

  public getChannelCount(): number {
    return this.channelSubscribers.size;
  }
}
