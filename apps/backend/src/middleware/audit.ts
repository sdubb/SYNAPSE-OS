import type { Request, Response, NextFunction } from 'express';
import { AuditEngine } from '@synapse/audit-engine';

export function auditMiddleware(auditEngine: AuditEngine) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only capture state-mutating requests (POST, PUT, PATCH, DELETE)
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (this: Response, ...args: unknown[]): Response {
      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;

      void auditEngine.log({
        category: 'SYSTEM',
        eventType: `api.${req.method.toLowerCase()}.${req.path.replace(/\//g, '_').slice(1) || 'root'}`,
        severity: statusCode >= 400 ? 'WARNING' : 'INFO',
        tenantId: req.tenantId || 'default_tenant',
        actor: {
          type: req.user ? 'USER' : 'ANONYMOUS',
          id: req.user?.userId || 'anonymous',
          tenantId: req.tenantId || 'default_tenant',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        correlationId: (req.headers['x-request-id'] as string) || undefined,
        details: {
          method: req.method,
          path: req.path,
          statusCode,
          durationMs,
        },
        timestamp: new Date().toISOString(),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalEnd as any).apply(this, args);
    };

    next();
  };
}
