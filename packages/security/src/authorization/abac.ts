import { type UserRole, type PermissionAction } from "@synapse/contracts";

export interface AbacSubject {
  userId: string;
  tenantId: string;
  role: UserRole;
  permissions?: PermissionAction[];
  securityClearanceLevel?: number; // 1 (public), 2 (internal), 3 (confidential), 4 (restricted)
  assignedWorkspaces?: string[];
  attributes?: Record<string, unknown>;
}

export interface AbacResource {
  type: string; // e.g. "workspace", "agent", "secret", "database"
  tenantId: string;
  resourceId: string;
  ownerId?: string;
  workspaceId?: string;
  classificationLevel?: number;
  attributes?: Record<string, unknown>;
}

export interface AbacEnvironment {
  clientIp?: string;
  requestTime?: Date;
  isProduction?: boolean;
  geographicRegion?: string;
}

export interface AbacPolicyRule {
  id: string;
  name: string;
  effect: "ALLOW" | "DENY";
  action: string;
  condition: (subject: AbacSubject, resource: AbacResource, env: AbacEnvironment) => boolean;
}

export class AbacService {
  private rules: AbacPolicyRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  public addRule(rule: AbacPolicyRule): void {
    this.rules.push(rule);
  }

  /**
   * Evaluates an ABAC request against all rules.
   * Deny rules take immediate precedence over allow rules.
   */
  public evaluate(
    subject: AbacSubject,
    resource: AbacResource,
    action: string,
    environment?: AbacEnvironment
  ): { allowed: boolean; reason: string; matchedRuleId?: string } {
    const env = environment ?? { requestTime: new Date() };

    // 1. Strict Tenant Isolation (Baseline invariant)
    if (subject.tenantId !== resource.tenantId) {
      return {
        allowed: false,
        reason: `Tenant isolation violation: Subject tenant '${subject.tenantId}' does not match resource tenant '${resource.tenantId}'`,
      };
    }

    // 2. Evaluate explicit DENY rules first
    for (const rule of this.rules) {
      if (rule.effect === "DENY" && (rule.action === "*" || rule.action === action)) {
        if (rule.condition(subject, resource, env)) {
          return {
            allowed: false,
            reason: `Action blocked by ABAC policy rule: ${rule.name}`,
            matchedRuleId: rule.id,
          };
        }
      }
    }

    // 3. Evaluate ALLOW rules
    for (const rule of this.rules) {
      if (rule.effect === "ALLOW" && (rule.action === "*" || rule.action === action)) {
        if (rule.condition(subject, resource, env)) {
          return {
            allowed: true,
            reason: `Action permitted by ABAC policy rule: ${rule.name}`,
            matchedRuleId: rule.id,
          };
        }
      }
    }

    return {
      allowed: false,
      reason: "No explicit ABAC allow rule matched (default-deny)",
    };
  }

  private registerDefaultRules(): void {
    // Rule: Admins and Owners can access any resource within their tenant
    this.addRule({
      id: "abac-admin-tenant-access",
      name: "Tenant Admin Full Resource Access",
      effect: "ALLOW",
      action: "*",
      condition: (subject, resource) =>
        (subject.role === "admin" || subject.role === "owner") && subject.tenantId === resource.tenantId,
    });

    // Rule: Developers can access their own resources or workspace assigned resources
    this.addRule({
      id: "abac-developer-workspace-access",
      name: "Developer Workspace Access",
      effect: "ALLOW",
      action: "*",
      condition: (subject, resource) => {
        if (subject.role !== "developer") return false;
        if (resource.ownerId && resource.ownerId === subject.userId) return true;
        if (resource.workspaceId && subject.assignedWorkspaces?.includes(resource.workspaceId)) return true;
        return false;
      },
    });

    // Rule: Security clearance classification check
    this.addRule({
      id: "abac-clearance-denial",
      name: "Insufficient Security Clearance",
      effect: "DENY",
      action: "*",
      condition: (subject, resource) => {
        const required = resource.classificationLevel ?? 1;
        const actual = subject.securityClearanceLevel ?? 1;
        return actual < required;
      },
    });
  }
}
