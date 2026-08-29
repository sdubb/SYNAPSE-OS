/**
 * @file AgentRegistry.ts
 * @description Central catalog of agent templates, prompt overrides, tool configs, and access-governed registry for Synapse OS.
 */

import { EventEmitter } from 'node:events';
import { AgentRegistration, AgentDefinitionInput } from './AgentRegistration.js';
import { AgentDiscovery, DiscoveryFilter, DiscoveryResult } from './AgentDiscovery.js';
import { AgentCapabilities } from './AgentCapabilities.js';
import { AgentAccessContext } from './AgentOwnership.js';

export interface AgentRegistryEvents {
  agent_registered: (agent: AgentRegistration) => void;
  agent_updated: (agent: AgentRegistration) => void;
  agent_deprecated: (agent: AgentRegistration) => void;
  agent_deleted: (agentId: string) => void;
  agent_health_changed: (data: { agentId: string; oldStatus: string; newStatus: string; reason: string }) => void;
}

export class AgentRegistry extends EventEmitter {
  private readonly agents: Map<string, AgentRegistration> = new Map();
  private readonly tenantIndex: Map<string, Set<string>> = new Map();

  constructor(seedDefaults: boolean = true) {
    super();
    if (seedDefaults) {
      this.seedDefaultTemplates();
    }
  }

  public register(input: AgentDefinitionInput): AgentRegistration {
    if (this.agents.has(input.id)) {
      throw new Error(`Agent with ID '${input.id}' is already registered. Use update() to modify.`);
    }

    const agent = new AgentRegistration(input);
    this.agents.set(agent.id, agent);

    const tenantId = agent.ownership.tenantId;
    if (!this.tenantIndex.has(tenantId)) {
      this.tenantIndex.set(tenantId, new Set());
    }
    this.tenantIndex.get(tenantId)!.add(agent.id);

    agent.healthTracker.on('health_changed', (payload) => {
      this.emit('agent_health_changed', payload);
    });

    this.emit('agent_registered', agent);
    return agent;
  }

  public get(agentId: string, context?: AgentAccessContext): AgentRegistration | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return undefined;
    }

    if (context && !agent.ownership.canRead(context)) {
      return undefined;
    }

    return agent;
  }

  public getOrThrow(agentId: string, context?: AgentAccessContext): AgentRegistration {
    const agent = this.get(agentId, context);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found or access denied`);
    }
    return agent;
  }

  public update(agentId: string, updates: Partial<AgentDefinitionInput>, context?: AgentAccessContext): AgentRegistration {
    const existing = this.getOrThrow(agentId, context);

    if (context && !existing.ownership.canModify(context)) {
      throw new Error(`Access denied: User does not have permission to modify agent '${agentId}'`);
    }

    const updated = existing.cloneWithOverrides(updates);
    this.agents.set(agentId, updated);

    this.emit('agent_updated', updated);
    return updated;
  }

  public deprecate(agentId: string, reason: string, context?: AgentAccessContext): AgentRegistration {
    return this.update(agentId, { isDeprecated: true, deprecationReason: reason }, context);
  }

  public delete(agentId: string, context?: AgentAccessContext): boolean {
    const existing = this.getOrThrow(agentId, context);

    if (context && !existing.ownership.canDelete(context)) {
      throw new Error(`Access denied: User does not have permission to delete agent '${agentId}'`);
    }

    this.agents.delete(agentId);
    const tenantSet = this.tenantIndex.get(existing.ownership.tenantId);
    if (tenantSet) {
      tenantSet.delete(agentId);
    }

    this.emit('agent_deleted', agentId);
    return true;
  }

  public list(filter: DiscoveryFilter = {}): DiscoveryResult {
    return AgentDiscovery.discover(this.agents.values(), filter);
  }

  public listByTenant(tenantId: string): readonly AgentRegistration[] {
    const ids = this.tenantIndex.get(tenantId);
    if (!ids) {
      return [];
    }
    const result: AgentRegistration[] = [];
    for (const id of ids) {
      const agent = this.agents.get(id);
      if (agent) {
        result.push(agent);
      }
    }
    return Object.freeze(result);
  }

  public findBestAgent(requiredTools: readonly string[], provider?: string): AgentRegistration | undefined {
    const candidates = AgentDiscovery.rankCandidatesForTask(this.agents.values(), requiredTools, provider);
    return candidates.length > 0 ? candidates[0] : undefined;
  }

  public size(): number {
    return this.agents.size;
  }

  public clear(): void {
    this.agents.clear();
    this.tenantIndex.clear();
  }

  public seedDefaultTemplates(): void {
    // 1. General Developer Agent
    this.register({
      id: 'synapse-general-developer',
      name: 'General Software Engineer',
      description: 'Autonomous full-stack engineer capable of file editing, command execution, and problem solving',
      version: '1.0.0',
      author: 'Synapse Core Team',
      systemPrompt: `You are an expert autonomous software engineer working in workspace: {{WORKSPACE}}.
Your tenant ID is {{TENANT_ID}}.
Goal: {{TASK_GOAL}}
Write clean, modular, tested, and robust code adhering to project standards.`,
      modelConfig: {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet-20250219',
        temperature: 0.2,
        maxTokens: 8192,
        contextWindowTokens: 200_000,
        stream: true,
      },
      capabilities: AgentCapabilities.createDefaultFullDev(),
      ownership: {
        agentId: 'synapse-general-developer',
        ownerId: 'system',
        tenantId: 'system',
        visibility: 'PUBLIC_SYSTEM',
        acl: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tags: ['developer', 'coding', 'typescript', 'python', 'fullstack'],
    });

    // 2. Read-Only Codebase Researcher & Auditor
    this.register({
      id: 'synapse-code-researcher',
      name: 'Codebase Researcher & Auditor',
      description: 'Constrained read-only auditor for deep codebase exploration, search, and architectural analysis',
      version: '1.0.0',
      author: 'Synapse Core Team',
      systemPrompt: `You are a read-only codebase researcher and auditor.
Workspace: {{WORKSPACE}}
Goal: {{TASK_GOAL}}
Analyze code thoroughly without making any file or shell modifications.`,
      modelConfig: {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet-20250219',
        temperature: 0.0,
        maxTokens: 4096,
        contextWindowTokens: 200_000,
        stream: true,
      },
      capabilities: AgentCapabilities.createDefaultReadOnly(),
      ownership: {
        agentId: 'synapse-code-researcher',
        ownerId: 'system',
        tenantId: 'system',
        visibility: 'PUBLIC_SYSTEM',
        acl: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tags: ['researcher', 'auditor', 'read-only', 'analysis'],
    });

    // 3. Automated Test Engineer
    this.register({
      id: 'synapse-test-engineer',
      name: 'Verification & QA Engineer',
      description: 'Specialized agent for writing unit, integration, and e2e test suites and verifying build assertions',
      version: '1.0.0',
      author: 'Synapse Core Team',
      systemPrompt: `You are a Quality Assurance & Verification Engineer in workspace: {{WORKSPACE}}.
Goal: {{TASK_GOAL}}
Create comprehensive test suites, reproduce bug scenarios, and ensure zero test regressions.`,
      modelConfig: {
        provider: 'openai',
        modelId: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 8192,
        contextWindowTokens: 128_000,
        stream: true,
      },
      capabilities: AgentCapabilities.createDefaultFullDev(),
      ownership: {
        agentId: 'synapse-test-engineer',
        ownerId: 'system',
        tenantId: 'system',
        visibility: 'PUBLIC_SYSTEM',
        acl: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tags: ['qa', 'testing', 'verification', 'tdd'],
    });
  }
}
