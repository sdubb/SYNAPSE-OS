import type { Request, Response, NextFunction } from 'express';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    if (user.roles.includes('superadmin') || user.permissions.includes('*') || user.permissions.includes(permission)) {
      return next();
    }

    res.status(403).json({
      error: 'FORBIDDEN',
      message: `Permission "${permission}" required to perform this action.`,
    });
  };
}
