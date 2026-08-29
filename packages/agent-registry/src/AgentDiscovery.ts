/**
 * @file AgentDiscovery.ts
 * @description Advanced querying, filtering, access-aware discovery, and ranking for Synapse OS agents.
 */

import { AgentRegistration } from './AgentRegistration.js';
import { AgentAccessContext } from './AgentOwnership.js';
import { AgentHealthStatus } from './AgentHealth.js';

export interface DiscoveryFilter {
  readonly tenantId?: string;
  readonly accessContext?: AgentAccessContext;
  readonly tags?: readonly string[];
  readonly matchAllTags?: boolean;
  readonly requiredTools?: readonly string[];
  readonly modelProvider?: string;
  readonly modelId?: string;
  readonly query?: string;
  readonly status?: readonly AgentHealthStatus[];
  readonly includeDeprecated?: boolean;
  readonly minMemoryMb?: number;
  readonly minCpuCores?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'name' | 'version' | 'createdAt' | 'health' | 'activeSessions';
  readonly sortOrder?: 'asc' | 'desc';
}

export interface DiscoveryResult {
  readonly items: readonly AgentRegistration[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export class AgentDiscovery {
  public static discover(
    agents: Iterable<AgentRegistration>,
    filter: DiscoveryFilter
  ): DiscoveryResult {
    const list: AgentRegistration[] = [];

    for (const agent of agents) {
      if (filter.accessContext && !agent.ownership.canRead(filter.accessContext)) {
        continue;
      }

      if (filter.tenantId && agent.ownership.tenantId !== filter.tenantId && agent.ownership.visibility !== 'PUBLIC_SYSTEM') {
        continue;
      }

      if (!filter.includeDeprecated && agent.isDeprecated) {
        continue;
      }

      if (filter.tags && filter.tags.length > 0) {
        if (filter.matchAllTags) {
          const hasAll = filter.tags.every((t) => agent.tags.includes(t));
          if (!hasAll) continue;
        } else {
          const hasAny = filter.tags.some((t) => agent.tags.includes(t));
          if (!hasAny) continue;
        }
      }

      if (filter.requiredTools && filter.requiredTools.length > 0) {
        const hasTools = filter.requiredTools.every((tool) => agent.capabilities.isToolAllowed(tool));
        if (!hasTools) continue;
      }

      if (filter.modelProvider && agent.modelConfig.provider !== filter.modelProvider) {
        continue;
      }

      if (filter.modelId && agent.modelConfig.modelId !== filter.modelId) {
        continue;
      }

      const agentCap = agent.capabilities.getConfig();
      if (filter.minMemoryMb && agentCap.requiredMemoryMb < filter.minMemoryMb) {
        continue;
      }
      if (filter.minCpuCores && agentCap.requiredCpuCores < filter.minCpuCores) {
        continue;
      }

      if (filter.status && filter.status.length > 0) {
        const currentHealth = agent.healthTracker.getStatus();
        if (!filter.status.includes(currentHealth)) {
          continue;
        }
      }

      if (filter.query) {
        const q = filter.query.toLowerCase().trim();
        const matchesName = agent.name.toLowerCase().includes(q);
        const matchesDesc = agent.description.toLowerCase().includes(q);
        const matchesId = agent.id.toLowerCase().includes(q);
        const matchesTags = agent.tags.some((t) => t.toLowerCase().includes(q));

        if (!matchesName && !matchesDesc && !matchesId && !matchesTags) {
          continue;
        }
      }

      list.push(agent);
    }

    const sortBy = filter.sortBy ?? 'name';
    const sortOrder = filter.sortOrder ?? 'asc';
    const multiplier = sortOrder === 'desc' ? -1 : 1;

    list.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * multiplier;
        case 'version':
          return a.version.localeCompare(b.version) * multiplier;
        case 'createdAt':
          return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
        case 'activeSessions':
          return (a.healthTracker.getMetrics().activeSessions - b.healthTracker.getMetrics().activeSessions) * multiplier;
        case 'health': {
          const rank = (status: AgentHealthStatus): number => {
            switch (status) {
              case 'HEALTHY': return 4;
              case 'DEGRADED': return 3;
              case 'DRAINING': return 2;
              case 'UNHEALTHY': return 1;
              case 'OFFLINE': return 0;
            }
          };
          return (rank(a.healthTracker.getStatus()) - rank(b.healthTracker.getStatus())) * multiplier;
        }
        default:
          return 0;
      }
    });

    const total = list.length;
    const offset = Math.max(0, filter.offset ?? 0);
    const limit = Math.max(1, filter.limit ?? 50);
    const paged = list.slice(offset, offset + limit);

    return {
      items: Object.freeze(paged),
      total,
      limit,
      offset,
    };
  }

  public static rankCandidatesForTask(
    agents: Iterable<AgentRegistration>,
    requiredTools: readonly string[],
    preferredModelProvider?: string
  ): AgentRegistration[] {
    const candidates: Array<{ agent: AgentRegistration; score: number }> = [];

    for (const agent of agents) {
      if (agent.isDeprecated) continue;
      const health = agent.healthTracker.getStatus();
      if (health === 'OFFLINE' || health === 'UNHEALTHY' || health === 'DRAINING') continue;

      let score = 100;

      // Check required tools
      const allToolsSupported = requiredTools.every((t) => agent.capabilities.isToolAllowed(t));
      if (!allToolsSupported) continue;

      if (health === 'HEALTHY') score += 50;
      else if (health === 'DEGRADED') score += 10;

      if (preferredModelProvider && agent.modelConfig.provider === preferredModelProvider) {
        score += 30;
      }

      // Penalize heavily loaded agents
      const activeSessions = agent.healthTracker.getMetrics().activeSessions;
      score -= activeSessions * 10;

      // Reward lower average latency
      const avgLatency = agent.healthTracker.getMetrics().averageLatencyMs;
      if (avgLatency > 0) {
        score -= Math.min(20, Math.floor(avgLatency / 1000));
      }

      candidates.push({ agent, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.map((c) => c.agent);
  }
}
