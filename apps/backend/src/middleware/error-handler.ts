import type { Request, Response, NextFunction } from 'express';
import { logger } from '@synapse/observability';

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  requestId?: string;
  stack?: string;
}

export function errorHandlerMiddleware(
  err: Error & { statusCode?: number; status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = (req.headers['x-request-id'] as string) || undefined;

  logger.error(`API Error on ${req.method} ${req.path}: ${err.message}`, err, {
    requestId,
    tenantId: req.tenantId,
    statusCode,
  });

  const response: ApiErrorResponse = {
    error: err.name || 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please contact support.'
      : err.message,
    statusCode,
    requestId,
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
