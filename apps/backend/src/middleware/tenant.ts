import type { Request, Response, NextFunction } from 'express';
import { TenantContext } from '@synapse/tenancy';

// Well-known tenant slugs → UUID mappings for development convenience
const TENANT_SLUG_MAP: Record<string, string> = {
  'default': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'default_tenant': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'tenant_default': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'dev_tenant': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'system': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
};

function resolveTenantId(raw: string): string {
  // If it's already a valid UUID, use it as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  // Try slug map or return valid default UUID
  return TENANT_SLUG_MAP[raw] || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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

  // Use the verified user tenant ID as the source of truth
  const tenantId = userTenant || headerTenant || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

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
