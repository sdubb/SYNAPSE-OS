import type { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export function rateLimitMiddleware(options: { maxRequests?: number; windowMs?: number } = {}) {
  const max = options.maxRequests ?? 500;
  const windowMs = options.windowMs ?? 60000;
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req.tenantId || req.ip || 'anonymous') as string;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: max, lastRefill: now };
      buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      if (elapsed >= windowMs) {
        bucket.tokens = max;
        bucket.lastRefill = now;
      }
    }

    if (bucket.tokens <= 0) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please retry after rate limit resets.',
      });
      return;
    }

    bucket.tokens -= 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', bucket.tokens);

    next();
  };
}
