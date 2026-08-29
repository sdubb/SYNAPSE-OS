import { type UserRole, type PermissionAction } from "@synapse/contracts";
import {
  ADMIN_PERMISSIONS,
  DEVELOPER_PERMISSIONS,
  OPERATOR_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  VERIFIER_PERMISSIONS,
  VIEWER_PERMISSIONS,
} from "./permissions.js";

export class RbacService {
  private rolePermissions: Map<UserRole, Set<PermissionAction>> = new Map();

  constructor() {
    this.rolePermissions.set("owner", new Set(ADMIN_PERMISSIONS));
    this.rolePermissions.set("admin", new Set(ADMIN_PERMISSIONS));
    this.rolePermissions.set("developer", new Set(DEVELOPER_PERMISSIONS));
    this.rolePermissions.set("operator", new Set(OPERATOR_PERMISSIONS));
    this.rolePermissions.set("auditor", new Set(AUDITOR_PERMISSIONS));
    this.rolePermissions.set("verifier", new Set(VERIFIER_PERMISSIONS));
    this.rolePermissions.set("viewer", new Set(VIEWER_PERMISSIONS));
  }

  /**
   * Checks if a role is granted a specific permission.
   */
  public hasPermission(role: UserRole, permission: PermissionAction): boolean {
    const permissions = this.rolePermissions.get(role);
    if (!permissions) return false;
    return permissions.has(permission);
  }

  /**
   * Gets all permissions assigned to a role.
   */
  public getPermissions(role: UserRole): PermissionAction[] {
    const permissions = this.rolePermissions.get(role);
    return permissions ? Array.from(permissions) : [];
  }

  /**
   * Extends or overrides permissions for a specific role.
   */
  public grantPermission(role: UserRole, permission: PermissionAction): void {
    let permissions = this.rolePermissions.get(role);
    if (!permissions) {
      permissions = new Set();
      this.rolePermissions.set(role, permissions);
    }
    permissions.add(permission);
  }
}
