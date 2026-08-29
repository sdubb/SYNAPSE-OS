import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantSecurityContext } from "@synapse/contracts";

export interface TenantContextData {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export class TenantContext {
  /**
   * Run a function within an isolated tenant context.
   */
  static run<T>(data: TenantContextData, fn: () => T): T {
    if (!data.tenantId || typeof data.tenantId !== "string" || data.tenantId.trim() === "") {
      throw new TenantContextError("Invalid tenant context: tenantId is required and must be non-empty.");
    }
    return tenantStorage.run(data, fn);
  }

  /**
   * Run an asynchronous function within an isolated tenant context.
   */
  static async runAsync<T>(data: TenantContextData, fn: () => Promise<T>): Promise<T> {
    if (!data.tenantId || typeof data.tenantId !== "string" || data.tenantId.trim() === "") {
      throw new TenantContextError("Invalid tenant context: tenantId is required and must be non-empty.");
    }
    return tenantStorage.run(data, fn);
  }

  /**
   * Get the current tenant context data if active, or undefined.
   */
  static get(): TenantContextData | undefined {
    return tenantStorage.getStore();
  }

  /**
   * Require active tenant context. Throws TenantContextError if none is set.
   */
  static require(): TenantContextData {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new TenantContextError("Tenant context is required but no active tenant context was found in the current execution scope.");
    }
    return store;
  }

  /**
   * Require the active tenantId.
   */
  static requireTenantId(): string {
    return TenantContext.require().tenantId;
  }

  /**
   * Get active tenantId or undefined.
   */
  static getTenantId(): string | undefined {
    return tenantStorage.getStore()?.tenantId;
  }

  /**
   * Create a TenantContextData from a TenantSecurityContext.
   */
  static fromSecurityContext(sec: TenantSecurityContext, traceId?: string): TenantContextData {
    return {
      tenantId: sec.tenantId,
      userId: sec.userId,
      userEmail: sec.userEmail,
      role: sec.role as string | undefined,
      permissions: sec.permissions as string[] | undefined,
      sessionId: sec.sessionId,
      traceId: traceId ?? crypto.randomUUID(),
    };
  }
}
