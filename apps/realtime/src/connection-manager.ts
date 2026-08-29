import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';

export interface AuthenticatedClient {
  connectionId: string;
  socket: WebSocket;
  userId: string;
  tenantId: string;
  roles: string[];
  connectedAt: string;
  lastPingAt: number;
  isAlive: boolean;
  subscriptions: Set<string>;
}

export interface AuthValidator {
  verifyToken(token: string): Promise<{ userId: string; tenantId: string; roles: string[] } | null>;
}

export class ConnectionManager {
  private connections = new Map<string, AuthenticatedClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly validator?: AuthValidator;

  constructor(validator?: AuthValidator) {
    this.validator = validator;
  }

  public startHeartbeat(intervalMs = 30000): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, client] of this.connections.entries()) {
        if (!client.isAlive) {
          client.socket.terminate();
          this.connections.delete(id);
          continue;
        }

        client.isAlive = false;
        try {
          client.socket.ping();
          client.lastPingAt = now;
        } catch {
          this.connections.delete(id);
        }
      }
    }, intervalMs);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public async authenticateConnection(
    socket: WebSocket,
    token?: string
  ): Promise<AuthenticatedClient | null> {
    let authData = {
      userId: 'anonymous_user',
      tenantId: 'default_tenant',
      roles: ['viewer'],
    };

    if (this.validator && token) {
      const verified = await this.validator.verifyToken(token);
      if (!verified) return null;
      authData = verified;
    }

    const connectionId = randomUUID();
    const client: AuthenticatedClient = {
      connectionId,
      socket,
      userId: authData.userId,
      tenantId: authData.tenantId,
      roles: authData.roles,
      connectedAt: new Date().toISOString(),
      lastPingAt: Date.now(),
      isAlive: true,
      subscriptions: new Set<string>(),
    };

    this.connections.set(connectionId, client);
    return client;
  }

  public handlePong(connectionId: string): void {
    const client = this.connections.get(connectionId);
    if (client) {
      client.isAlive = true;
    }
  }

  public removeConnection(connectionId: string): boolean {
    return this.connections.delete(connectionId);
  }

  public getClient(connectionId: string): AuthenticatedClient | null {
    return this.connections.get(connectionId) ?? null;
  }

  public getAllClients(): AuthenticatedClient[] {
    return Array.from(this.connections.values());
  }

  public getClientsForTenant(tenantId: string): AuthenticatedClient[] {
    return Array.from(this.connections.values()).filter((c) => c.tenantId === tenantId);
  }

  public getCount(): number {
    return this.connections.size;
  }
}
