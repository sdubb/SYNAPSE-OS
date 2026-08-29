/**
 * @file TeamController.ts
 * @description Multi-agent team governance, role assignment, budget limits, and sub-agent supervision for Synapse OS.
 */

import { EventEmitter } from 'node:events';
import { BudgetExceededError, ControlPlaneError } from './errors/ControlPlaneError.js';

export type TeamMemberRole = 'LEAD' | 'WORKER' | 'REVIEWER' | 'SPECIALIST';

export interface TeamMember {
  readonly agentId: string;
  readonly role: TeamMemberRole;
  readonly assignedAt: Date;
}

export interface TeamBudgetLimits {
  readonly maxTokens: number;
  readonly maxCostUsd: number;
  readonly maxSubAgentDepth: number;
  readonly maxConcurrentSessions: number;
}

export interface TeamUsageMetrics {
  readonly tokensConsumed: number;
  readonly costUsd: number;
  readonly activeSessions: number;
  readonly totalDelegations: number;
}

export interface DelegationNode {
  readonly delegationId: string;
  readonly parentSessionId: string;
  readonly parentAgentId: string;
  readonly childSessionId: string;
  readonly childAgentId: string;
  readonly depth: number;
  readonly taskGoal: string;
  readonly status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ESCALATED';
  readonly createdAt: Date;
  readonly completedAt?: Date;
}

export interface TeamRecord {
  readonly teamId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly leadAgentId: string;
  readonly members: readonly TeamMember[];
  readonly budget: TeamBudgetLimits;
  readonly usage: TeamUsageMetrics;
  readonly activeDelegations: readonly DelegationNode[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTeamOptions {
  readonly teamId?: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly leadAgentId: string;
  readonly initialMembers?: readonly { agentId: string; role: TeamMemberRole }[];
  readonly budget?: Partial<TeamBudgetLimits>;
}

export class TeamController extends EventEmitter {
  private readonly teams: Map<string, TeamRecord> = new Map();

  constructor() {
    super();
  }

  public createTeam(options: CreateTeamOptions): TeamRecord {
    const teamId = options.teamId ?? `team-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (this.teams.has(teamId)) {
      throw new Error(`Team '${teamId}' already exists`);
    }

    const members: TeamMember[] = [
      {
        agentId: options.leadAgentId,
        role: 'LEAD',
        assignedAt: new Date(),
      },
    ];

    if (options.initialMembers) {
      for (const m of options.initialMembers) {
        if (m.agentId !== options.leadAgentId) {
          members.push({
            agentId: m.agentId,
            role: m.role,
            assignedAt: new Date(),
          });
        }
      }
    }

    const budget: TeamBudgetLimits = {
      maxTokens: options.budget?.maxTokens ?? 500_000,
      maxCostUsd: options.budget?.maxCostUsd ?? 25.0,
      maxSubAgentDepth: options.budget?.maxSubAgentDepth ?? 3,
      maxConcurrentSessions: options.budget?.maxConcurrentSessions ?? 10,
    };

    const team: TeamRecord = {
      teamId,
      tenantId: options.tenantId,
      name: options.name,
      description: options.description,
      leadAgentId: options.leadAgentId,
      members: Object.freeze(members),
      budget: Object.freeze(budget),
      usage: Object.freeze({
        tokensConsumed: 0,
        costUsd: 0,
        activeSessions: 0,
        totalDelegations: 0,
      }),
      activeDelegations: Object.freeze([]),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.teams.set(teamId, team);
    this.emit('team_created', team);
    return team;
  }

  public addMember(teamId: string, agentId: string, role: TeamMemberRole): TeamRecord {
    const team = this.getTeamOrThrow(teamId);
    const existing = team.members.find((m) => m.agentId === agentId);

    let updatedMembers: TeamMember[];
    if (existing) {
      updatedMembers = team.members.map((m) => (m.agentId === agentId ? { ...m, role } : m));
    } else {
      updatedMembers = [...team.members, { agentId, role, assignedAt: new Date() }];
    }

    const updated: TeamRecord = {
      ...team,
      members: Object.freeze(updatedMembers),
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updated);
    this.emit('team_member_updated', { teamId, agentId, role });
    return updated;
  }

  public removeMember(teamId: string, agentId: string): TeamRecord {
    const team = this.getTeamOrThrow(teamId);
    if (team.leadAgentId === agentId) {
      throw new Error(`Cannot remove team lead agent '${agentId}' from team '${teamId}'`);
    }

    const updatedMembers = team.members.filter((m) => m.agentId !== agentId);
    const updated: TeamRecord = {
      ...team,
      members: Object.freeze(updatedMembers),
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updated);
    this.emit('team_member_removed', { teamId, agentId });
    return updated;
  }

  public recordTeamUsage(teamId: string, tokens: number, costUsd: number): void {
    const team = this.getTeamOrThrow(teamId);
    const newTokens = team.usage.tokensConsumed + tokens;
    const newCost = Number((team.usage.costUsd + costUsd).toFixed(4));

    if (newTokens > team.budget.maxTokens) {
      throw new BudgetExceededError(teamId, 'tokens', {
        details: { consumed: newTokens, limit: team.budget.maxTokens },
      });
    }

    if (newCost > team.budget.maxCostUsd) {
      throw new BudgetExceededError(teamId, 'cost', {
        details: { consumed: newCost, limit: team.budget.maxCostUsd },
      });
    }

    const updated: TeamRecord = {
      ...team,
      usage: Object.freeze({
        ...team.usage,
        tokensConsumed: newTokens,
        costUsd: newCost,
      }),
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updated);
    this.emit('team_usage_updated', { teamId, usage: updated.usage });
  }

  public registerDelegation(
    teamId: string,
    parentSessionId: string,
    parentAgentId: string,
    childSessionId: string,
    childAgentId: string,
    depth: number,
    taskGoal: string
  ): DelegationNode {
    const team = this.getTeamOrThrow(teamId);

    if (depth > team.budget.maxSubAgentDepth) {
      throw new ControlPlaneError(
        `Sub-agent recursion depth ${depth} exceeds team '${teamId}' max limit of ${team.budget.maxSubAgentDepth}`,
        { code: 'MAX_SUBAGENT_DEPTH_EXCEEDED', tenantId: team.tenantId }
      );
    }

    const isChildMember = team.members.some((m) => m.agentId === childAgentId);
    if (!isChildMember) {
      throw new ControlPlaneError(`Agent '${childAgentId}' is not a registered member of team '${teamId}'`, {
        code: 'AGENT_NOT_TEAM_MEMBER',
        tenantId: team.tenantId,
        agentId: childAgentId,
      });
    }

    const delegationId = `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const node: DelegationNode = {
      delegationId,
      parentSessionId,
      parentAgentId,
      childSessionId,
      childAgentId,
      depth,
      taskGoal,
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    const updated: TeamRecord = {
      ...team,
      activeDelegations: Object.freeze([...team.activeDelegations, node]),
      usage: Object.freeze({
        ...team.usage,
        totalDelegations: team.usage.totalDelegations + 1,
        activeSessions: team.usage.activeSessions + 1,
      }),
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updated);
    this.emit('delegation_started', { teamId, delegation: node });
    return node;
  }

  public completeDelegation(
    teamId: string,
    delegationId: string,
    status: 'COMPLETED' | 'FAILED' | 'ESCALATED'
  ): void {
    const team = this.getTeamOrThrow(teamId);
    const updatedDelegations = team.activeDelegations.map((d) => {
      if (d.delegationId === delegationId) {
        return {
          ...d,
          status,
          completedAt: new Date(),
        };
      }
      return d;
    });

    const updated: TeamRecord = {
      ...team,
      activeDelegations: Object.freeze(updatedDelegations),
      usage: Object.freeze({
        ...team.usage,
        activeSessions: Math.max(0, team.usage.activeSessions - 1),
      }),
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updated);
    this.emit('delegation_completed', { teamId, delegationId, status });
  }

  public getTeam(teamId: string): TeamRecord | undefined {
    return this.teams.get(teamId);
  }

  public getTeamOrThrow(teamId: string): TeamRecord {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new ControlPlaneError(`Team '${teamId}' not found`, { code: 'TEAM_NOT_FOUND' });
    }
    return team;
  }

  public listTeams(tenantId?: string): readonly TeamRecord[] {
    const list: TeamRecord[] = [];
    for (const t of this.teams.values()) {
      if (!tenantId || t.tenantId === tenantId) {
        list.push(t);
      }
    }
    return Object.freeze(list);
  }
}
