import type { Request, Response, NextFunction } from 'express';
import { TenantContext } from '@synapse/tenancy';

function resolveTenantId(raw: string): string {
  // If it's already a valid UUID, use it as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  // No hardcoded fallback — tenant must come from authenticated identity or valid UUID header
  return raw; // Return as-is; validation will catch non-UUID values
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Resolve tenant from authenticated user context, X-Tenant-Id header, or subdomain
  const rawHeaderTenant = req.headers['x-tenant-id'] as string;
  const rawUserTenant = req.user?.tenantId;

  const headerTenant = rawHeaderTenant ? resolveTenantId(rawHeaderTenant) : undefined;
  const userTenant = rawUserTenant ? resolveTenantId(rawUserTenant) : undefined;

  // Cross-tenant protection: if user is logged in, ensure their tenant matches the request header
  const isPrivileged = req.user?.roles.includes('superadmin') || req.user?.roles.includes('service');
  if (userTenant && headerTenant && userTenant !== headerTenant && !isPrivileged) {
    res.status(403).json({
      error: 'TENANT_MISMATCH',
      message: `Cross-tenant data access is strictly prohibited. Authenticated tenant is '${userTenant}', but request specified '${headerTenant}'.`,
    });
    return;
  }

  // Use the verified user tenant ID as the source of truth — no hardcoded fallback
  const tenantId = userTenant || headerTenant;
  if (!tenantId) {
    res.status(400).json({
      error: 'TENANT_REQUIRED',
      message: 'Tenant identity is required. Authenticate with a valid JWT or provide a valid tenant UUID in X-Tenant-Id header.',
    });
    return;
  }

  req.tenantId = tenantId;
  res.setHeader('X-Tenant-Id', tenantId);

  // Set up AsyncLocalStorage tenant context so repositories can access it
  TenantContext.run(
    {
      tenantId,
      userId: req.user?.userId,
      role: req.user?.roles?.[0],
      permissions: req.user?.permissions,
      traceId: req.headers['x-request-id'] as string,
    },
    () => next()
  );
}
