/**
 * @file AgentOwnership.ts
 * @description Tenant ownership, RBAC/ABAC access control mappings, and isolation boundaries for Synapse OS agents.
 */

export type AgentVisibility = 'PRIVATE' | 'TEAM_SHARED' | 'TENANT_SHARED' | 'PUBLIC_SYSTEM';

export type AgentRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'DEVELOPER' | 'VIEWER';

export interface AgentAccessContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly teamIds?: readonly string[];
}

export interface AccessControlEntry {
  readonly principalId: string;
  readonly principalType: 'USER' | 'TEAM' | 'ROLE' | 'TENANT';
  readonly role: AgentRole;
  readonly grantedAt: Date;
  readonly grantedBy: string;
}

export interface AgentOwnershipConfig {
  readonly agentId: string;
  readonly ownerId: string;
  readonly tenantId: string;
  readonly visibility: AgentVisibility;
  readonly primaryTeamId?: string;
  readonly acl: readonly AccessControlEntry[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class AgentOwnership {
  private readonly config: AgentOwnershipConfig;

  constructor(config: AgentOwnershipConfig) {
    this.config = Object.freeze({
      ...config,
      acl: Object.freeze([...config.acl]),
    });
  }

  public getConfig(): AgentOwnershipConfig {
    return this.config;
  }

  public get agentId(): string {
    return this.config.agentId;
  }

  public get ownerId(): string {
    return this.config.ownerId;
  }

  public get tenantId(): string {
    return this.config.tenantId;
  }

  public get visibility(): AgentVisibility {
    return this.config.visibility;
  }

  public canRead(context: AgentAccessContext): boolean {
    if (this.config.visibility === 'PUBLIC_SYSTEM') {
      return true;
    }

    if (context.tenantId !== this.config.tenantId) {
      return false;
    }

    if (context.userId === this.config.ownerId) {
      return true;
    }

    if (this.config.visibility === 'TENANT_SHARED') {
      return true;
    }

    if (this.config.visibility === 'TEAM_SHARED' && this.config.primaryTeamId) {
      if (context.teamIds && context.teamIds.includes(this.config.primaryTeamId)) {
        return true;
      }
    }

    return this.hasMatchingAcl(context, ['OWNER', 'ADMIN', 'OPERATOR', 'DEVELOPER', 'VIEWER']);
  }

  public canExecute(context: AgentAccessContext): boolean {
    if (!this.canRead(context)) {
      return false;
    }

    if (this.config.visibility === 'PUBLIC_SYSTEM') {
      return true;
    }

    if (context.userId === this.config.ownerId) {
      return true;
    }

    if (context.roles.includes('ADMIN') || context.roles.includes('OPERATOR') || context.roles.includes('DEVELOPER')) {
      return true;
    }

    return this.hasMatchingAcl(context, ['OWNER', 'ADMIN', 'OPERATOR', 'DEVELOPER']);
  }

  public canModify(context: AgentAccessContext): boolean {
    if (this.config.visibility === 'PUBLIC_SYSTEM') {
      return context.roles.includes('SYSTEM_ADMIN');
    }

    if (context.tenantId !== this.config.tenantId) {
      return false;
    }

    if (context.userId === this.config.ownerId) {
      return true;
    }

    if (context.roles.includes('ADMIN')) {
      return true;
    }

    return this.hasMatchingAcl(context, ['OWNER', 'ADMIN']);
  }

  public canDelete(context: AgentAccessContext): boolean {
    if (this.config.visibility === 'PUBLIC_SYSTEM') {
      return context.roles.includes('SYSTEM_ADMIN');
    }

    if (context.tenantId !== this.config.tenantId) {
      return false;
    }

    if (context.userId === this.config.ownerId) {
      return true;
    }

    return context.roles.includes('ADMIN') && this.hasMatchingAcl(context, ['OWNER']);
  }

  public grantAccess(entry: AccessControlEntry): AgentOwnership {
    const newAcl = this.config.acl.filter(
      (e) => !(e.principalId === entry.principalId && e.principalType === entry.principalType)
    );
    newAcl.push(entry);

    return new AgentOwnership({
      ...this.config,
      acl: newAcl,
      updatedAt: new Date(),
    });
  }

  public revokeAccess(principalId: string, principalType: AccessControlEntry['principalType']): AgentOwnership {
    const newAcl = this.config.acl.filter(
      (e) => !(e.principalId === principalId && e.principalType === principalType)
    );

    return new AgentOwnership({
      ...this.config,
      acl: newAcl,
      updatedAt: new Date(),
    });
  }

  private hasMatchingAcl(context: AgentAccessContext, allowedRoles: AgentRole[]): boolean {
    for (const entry of this.config.acl) {
      if (!allowedRoles.includes(entry.role)) {
        continue;
      }

      if (entry.principalType === 'USER' && entry.principalId === context.userId) {
        return true;
      }

      if (
        entry.principalType === 'TEAM' &&
        context.teamIds &&
        context.teamIds.includes(entry.principalId)
      ) {
        return true;
      }

      if (entry.principalType === 'ROLE' && context.roles.includes(entry.principalId)) {
        return true;
      }

      if (entry.principalType === 'TENANT' && entry.principalId === context.tenantId) {
        return true;
      }
    }

    return false;
  }
}
