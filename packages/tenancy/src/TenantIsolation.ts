import { TenantContext } from "./TenantContext.js";

export class CrossTenantAccessError extends Error {
  readonly requestedTenantId?: string;
  readonly activeTenantId?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;

  constructor(options: {
    message: string;
    requestedTenantId?: string;
    activeTenantId?: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    super(options.message);
    this.name = "CrossTenantAccessError";
    this.requestedTenantId = options.requestedTenantId;
    this.activeTenantId = options.activeTenantId;
    this.resourceType = options.resourceType;
    this.resourceId = options.resourceId;
  }
}

export interface TenantScopedEntity {
  tenantId: string;
  id?: string;
}

export class TenantIsolation {
  /**
   * Validate that an entity belongs to the currently active tenant context.
   * Throws CrossTenantAccessError if there is a mismatch.
   */
  static validateOwnership<T extends TenantScopedEntity>(
    entity: T,
    resourceType = "resource"
  ): T {
    const activeTenantId = TenantContext.requireTenantId();

    if (entity.tenantId !== activeTenantId) {
      throw new CrossTenantAccessError({
        message: `Tenant isolation violation: Access denied to ${resourceType} owned by tenant ${entity.tenantId}. Active context is tenant ${activeTenantId}.`,
        requestedTenantId: entity.tenantId,
        activeTenantId,
        resourceType,
        resourceId: entity.id,
      });
    }

    return entity;
  }

  /**
   * Validate that multiple entities all belong to the currently active tenant context.
   */
  static validateAllOwnership<T extends TenantScopedEntity>(
    entities: T[],
    resourceType = "resource"
  ): T[] {
    const activeTenantId = TenantContext.requireTenantId();

    for (const entity of entities) {
      if (entity.tenantId !== activeTenantId) {
        throw new CrossTenantAccessError({
          message: `Tenant isolation violation: One or more ${resourceType} items belong to tenant ${entity.tenantId}. Active context is tenant ${activeTenantId}.`,
          requestedTenantId: entity.tenantId,
          activeTenantId,
          resourceType,
          resourceId: entity.id,
        });
      }
    }

    return entities;
  }

  /**
   * Ensure that an explicitly passed tenantId matches the ambient tenant context.
   */
  static assertTenantMatch(targetTenantId: string, contextDescription = "operation"): void {
    const activeTenantId = TenantContext.requireTenantId();

    if (targetTenantId !== activeTenantId) {
      throw new CrossTenantAccessError({
        message: `Tenant mismatch in ${contextDescription}: target tenant is ${targetTenantId}, but active context is ${activeTenantId}.`,
        requestedTenantId: targetTenantId,
        activeTenantId,
      });
    }
  }

  /**
   * Helper to ensure an entity creation input is stamped with the active tenantId.
   */
  static stampWithActiveTenant<T extends Record<string, unknown>>(
    input: T
  ): T & { tenantId: string } {
    const tenantId = TenantContext.requireTenantId();
    return {
      ...input,
      tenantId,
    };
  }
}
