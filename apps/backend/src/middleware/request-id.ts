import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = Array.isArray(existingId) ? existingId[0] : (existingId as string) || randomUUID();

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
