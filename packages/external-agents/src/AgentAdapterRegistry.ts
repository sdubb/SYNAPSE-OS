import { ExternalAgent, ExternalAgentConfig } from './ExternalAgent.js';
import { IAgentAdapter, ExternalProtocol } from './AgentAdapter.js';
import { HTTPAgentAdapter } from './protocols/HTTPAgentAdapter.js';
import { WebSocketAgentAdapter } from './protocols/WebSocketAgentAdapter.js';
import { MCPAdapter } from './protocols/MCPAdapter.js';
import { ACPAdapter } from './protocols/ACPAdapter.js';

export class AgentAdapterRegistry {
  private agents = new Map<string, ExternalAgent>();
  private adapters = new Map<ExternalProtocol, IAgentAdapter>();

  constructor() {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters(): void {
    this.adapters.set('HTTP', new HTTPAgentAdapter());
    this.adapters.set('WEBSOCKET', new WebSocketAgentAdapter());
    this.adapters.set('MCP', new MCPAdapter());
    this.adapters.set('ACP', new ACPAdapter());
  }

  public registerAdapter(protocol: ExternalProtocol, adapter: IAgentAdapter): void {
    this.adapters.set(protocol, adapter);
  }

  public getAdapter(protocol: ExternalProtocol): IAgentAdapter | undefined {
    return this.adapters.get(protocol);
  }

  public registerAgent(config: ExternalAgentConfig): ExternalAgent {
    const agent = new ExternalAgent(config);
    this.agents.set(agent.id, agent);
    return agent;
  }

  public getAgent(id: string): ExternalAgent | null {
    return this.agents.get(id) ?? null;
  }

  public listAgents(tenantId?: string): ExternalAgent[] {
    const all = Array.from(this.agents.values());
    if (!tenantId) return all;
    return all.filter((a) => a.tenantId === tenantId);
  }

  public async checkAgentHealth(id: string): Promise<boolean> {
    const agent = this.getAgent(id);
    if (!agent) return false;

    const adapter = this.adapters.get(agent.protocol);
    if (!adapter) return false;

    return adapter.healthCheck(agent.endpoint, agent.credentials);
  }

  public removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }
}
