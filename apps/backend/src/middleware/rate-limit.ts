import type { Request, Response, NextFunction } from 'express';

/**
 * Rate limit store interface — supports pluggable backends.
 * In production, implement with Redis for distributed rate limiting.
 * The in-memory fallback is only for development/testing.
 */
export interface RateLimitStore {
  decrement(key: string, windowMs: number, maxTokens: number): { allowed: boolean; remaining: number };
  close?(): void;
}

/**
 * In-memory rate limit store — development/testing only.
 * NOT suitable for production multi-instance deployments.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  decrement(key: string, windowMs: number, maxTokens: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      if (elapsed >= windowMs) {
        bucket.tokens = maxTokens;
        bucket.lastRefill = now;
      }
    }

    if (bucket.tokens <= 0) {
      return { allowed: false, remaining: 0 };
    }

    bucket.tokens -= 1;
    return { allowed: true, remaining: bucket.tokens };
  }
}

/**
 * Token-bucket rate limit middleware with pluggable store.
 *
 * For production with Redis:
 *   import Redis from 'ioredis';
 *   const redis = new Redis(process.env.REDIS_URL);
 *   // Implement RedisRateLimitStore using Redis INCR + EXPIRE
 */
export function rateLimitMiddleware(options: {
  maxRequests?: number;
  windowMs?: number;
  store?: RateLimitStore;
} = {}) {
  const max = options.maxRequests ?? 500;
  const windowMs = options.windowMs ?? 60000;
  const store: RateLimitStore = options.store ?? new InMemoryRateLimitStore();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req.tenantId || req.ip || 'anonymous') as string;

    const { allowed, remaining } = store.decrement(key, windowMs, max);

    if (!allowed) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please retry after rate limit resets.',
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    next();
  };
}
