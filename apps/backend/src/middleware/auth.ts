import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '@synapse/security';
import { config } from '../config.js';
import { authController } from '../controllers/auth.controller.js';

export interface UserContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      tenantId?: string;
    }
  }
}

const jwtService = new JwtService({ secret: config.JWT_SECRET });

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow public endpoints to proceed without token
  if (req.path.startsWith('/health') || req.path === '/metrics') {
    return next();
  }

  // Allow login endpoint without auth (it IS the auth endpoint)
  if (req.path.endsWith('/auth/login') || req.path.endsWith('/auth/register')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  // 1. Support Bearer JWT token - cryptographically verify signature & claims
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const claims = jwtService.verify(token);
        // Bind tenantId strictly to the signed JWT claim, NEVER the header!
        req.user = {
          userId: claims.sub,
          tenantId: claims.tid,
          roles: Array.isArray(claims.role) ? claims.role : [claims.role],
          permissions: (claims.permissions as string[]) || ['*'],
        };
        return next();
      } catch (err: any) {
        res.status(401).json({
          error: 'INVALID_TOKEN',
          message: `JWT verification failed: ${err.message}`,
        });
        return;
      }
    }
  }

  // 2. Support API Key header - verify against database
  if (apiKey) {
    // Internal service key check (env variable, not hardcoded)
    const internalKey = process.env.SYNAPSE_INTERNAL_SYSTEM_KEY;
    if (internalKey && apiKey === internalKey) {
      req.user = {
        userId: 'sys_internal_service',
        tenantId: (req.headers['x-tenant-id'] as string) || 'system',
        roles: ['superadmin', 'service'],
        permissions: ['*'],
      };
      return next();
    }

    // Verify API key against database
    const keyData = authController.verifyApiKey(apiKey);
    if (keyData) {
      req.user = {
        userId: keyData.userId,
        tenantId: keyData.orgId,
        roles: ['api_service'],
        permissions: keyData.scopes,
      };
      return next();
    }

    res.status(401).json({
      error: 'INVALID_API_KEY',
      message: 'Invalid or expired API key',
    });
    return;
  }

  res.status(401).json({
    error: 'UNAUTHORIZED',
    message: 'Missing or invalid authentication token.',
  });
}
