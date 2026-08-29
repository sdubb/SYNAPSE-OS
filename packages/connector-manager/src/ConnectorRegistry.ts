import { randomUUID } from 'node:crypto';
import { ConnectorType } from './ConnectorAdapter.js';
import { ConnectorPolicyRules } from './ConnectorPolicy.js';

export type ConnectorStatus = 'ACTIVE' | 'PAUSED' | 'DISCONNECTED' | 'ERRORED';

export interface ConnectorInstance {
  id: string;
  tenantId: string;
  name: string;
  type: ConnectorType;
  enabled: boolean;
  status: ConnectorStatus;
  credentials: Record<string, string>;
  webhookSecret?: string;
  policyRules?: ConnectorPolicyRules;
  lastHealthCheck?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterConnectorInput {
  tenantId: string;
  name: string;
  type: ConnectorType;
  credentials: Record<string, string>;
  webhookSecret?: string;
  policyRules?: ConnectorPolicyRules;
  enabled?: boolean;
}

export class ConnectorRegistry {
  private connectors = new Map<string, ConnectorInstance>();

  public register(input: RegisterConnectorInput): ConnectorInstance {
    const id = randomUUID();
    const now = new Date().toISOString();

    const instance: ConnectorInstance = {
      id,
      tenantId: input.tenantId,
      name: input.name,
      type: input.type,
      enabled: input.enabled ?? true,
      status: 'ACTIVE',
      credentials: input.credentials,
      webhookSecret: input.webhookSecret,
      policyRules: input.policyRules,
      createdAt: now,
      updatedAt: now,
    };

    this.connectors.set(id, instance);
    return instance;
  }

  public getById(id: string): ConnectorInstance | null {
    return this.connectors.get(id) ?? null;
  }

  public listByTenant(tenantId: string): ConnectorInstance[] {
    return Array.from(this.connectors.values()).filter((c) => c.tenantId === tenantId);
  }

  public update(
    id: string,
    updates: Partial<ConnectorInstance>
  ): ConnectorInstance | null {
    const existing = this.connectors.get(id);
    if (!existing) return null;

    const updated: ConnectorInstance = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.connectors.set(id, updated);
    return updated;
  }

  public updateStatus(
    id: string,
    status: ConnectorStatus,
    error?: string
  ): ConnectorInstance | null {
    return this.update(id, {
      status,
      lastError: error,
      lastHealthCheck: new Date().toISOString(),
    });
  }

  public delete(id: string): boolean {
    return this.connectors.delete(id);
  }
}
