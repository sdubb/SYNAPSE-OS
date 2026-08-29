import { randomUUID } from 'node:crypto';
import { ExternalProtocol } from './AgentAdapter.js';

export interface ExternalAgentConfig {
  id?: string;
  tenantId: string;
  name: string;
  description?: string;
  protocol: ExternalProtocol;
  endpoint: string;
  credentials?: Record<string, string>;
  capabilities: string[];
  sandboxConstraints?: {
    allowedTools?: string[];
    deniedTools?: string[];
    maxTokensPerSession?: number;
    maxStepsPerSession?: number;
    requireApprovalForHighRisk?: boolean;
  };
  isActive?: boolean;
}

export class ExternalAgent {
  public readonly id: string;
  public readonly tenantId: string;
  public name: string;
  public description?: string;
  public readonly protocol: ExternalProtocol;
  public endpoint: string;
  public credentials: Record<string, string>;
  public capabilities: string[];
  public sandboxConstraints: {
    allowedTools?: string[];
    deniedTools?: string[];
    maxTokensPerSession?: number;
    maxStepsPerSession?: number;
    requireApprovalForHighRisk?: boolean;
  };
  public isActive: boolean;
  public readonly createdAt: string;
  public updatedAt: string;

  constructor(config: ExternalAgentConfig) {
    this.id = config.id ?? randomUUID();
    this.tenantId = config.tenantId;
    this.name = config.name;
    this.description = config.description;
    this.protocol = config.protocol;
    this.endpoint = config.endpoint;
    this.credentials = config.credentials ?? {};
    this.capabilities = config.capabilities ?? [];
    this.sandboxConstraints = config.sandboxConstraints ?? {
      requireApprovalForHighRisk: true,
      maxStepsPerSession: 50,
    };
    this.isActive = config.isActive ?? true;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  public updateConfig(updates: Partial<ExternalAgentConfig>): void {
    if (updates.name) this.name = updates.name;
    if (updates.description !== undefined) this.description = updates.description;
    if (updates.endpoint) this.endpoint = updates.endpoint;
    if (updates.credentials) this.credentials = { ...this.credentials, ...updates.credentials };
    if (updates.capabilities) this.capabilities = updates.capabilities;
    if (updates.sandboxConstraints) {
      this.sandboxConstraints = { ...this.sandboxConstraints, ...updates.sandboxConstraints };
    }
    if (updates.isActive !== undefined) this.isActive = updates.isActive;
    this.updatedAt = new Date().toISOString();
  }
}
