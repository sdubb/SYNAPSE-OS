export interface TenantQuotaConfig {
  maxConcurrentSessions: number;
  maxActiveAgents: number;
  maxDailyTokenSpendUsd: number;
  maxRequestsPerMinute: number;
  maxStorageBytes: number;
}

export interface TenantQuotaUsage {
  activeSessions: number;
  activeAgents: number;
  todayTokenSpendUsd: number;
  currentRequestsInWindow: number;
  usedStorageBytes: number;
}

export class TenantQuotaExceededError extends Error {
  readonly tenantId: string;
  readonly quotaName: string;
  readonly limit: number;
  readonly current: number;

  constructor(options: {
    tenantId: string;
    quotaName: string;
    limit: number;
    current: number;
  }) {
    super(
      `Tenant quota exceeded for tenant ${options.tenantId}: ${options.quotaName} limit is ${options.limit}, current usage is ${options.current}.`
    );
    this.name = "TenantQuotaExceededError";
    this.tenantId = options.tenantId;
    this.quotaName = options.quotaName;
    this.limit = options.limit;
    this.current = options.current;
  }
}

export class TenantRateLimitExceededError extends Error {
  readonly tenantId: string;
  readonly retryAfterSeconds: number;

  constructor(tenantId: string, retryAfterSeconds: number) {
    super(
      `Rate limit exceeded for tenant ${tenantId}. Retry after ${retryAfterSeconds} seconds.`
    );
    this.name = "TenantRateLimitExceededError";
    this.tenantId = tenantId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface SlidingWindowEntry {
  timestamps: number[];
}

export class TenantLimits {
  private readonly defaultQuotas: TenantQuotaConfig;
  private readonly tenantCustomQuotas = new Map<string, Partial<TenantQuotaConfig>>();
  private readonly rateLimitWindows = new Map<string, SlidingWindowEntry>();

  constructor(defaultQuotas?: Partial<TenantQuotaConfig>) {
    this.defaultQuotas = {
      maxConcurrentSessions: defaultQuotas?.maxConcurrentSessions ?? 20,
      maxActiveAgents: defaultQuotas?.maxActiveAgents ?? 50,
      maxDailyTokenSpendUsd: defaultQuotas?.maxDailyTokenSpendUsd ?? 500,
      maxRequestsPerMinute: defaultQuotas?.maxRequestsPerMinute ?? 600,
      maxStorageBytes: defaultQuotas?.maxStorageBytes ?? 50 * 1024 * 1024 * 1024, // 50 GB
    };
  }

  /**
   * Set custom quotas for a specific tenant.
   */
  setTenantQuota(tenantId: string, customQuota: Partial<TenantQuotaConfig>): void {
    this.tenantCustomQuotas.set(tenantId, customQuota);
  }

  /**
   * Get effective quota for a tenant.
   */
  getTenantQuota(tenantId: string): TenantQuotaConfig {
    const custom = this.tenantCustomQuotas.get(tenantId);
    return {
      ...this.defaultQuotas,
      ...custom,
    };
  }

  /**
   * Check rate limit using sliding window algorithm.
   */
  checkRateLimit(tenantId: string, windowMs = 60000): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const quota = this.getTenantQuota(tenantId);
    const maxRequests = quota.maxRequestsPerMinute;

    let window = this.rateLimitWindows.get(tenantId);
    if (!window) {
      window = { timestamps: [] };
      this.rateLimitWindows.set(tenantId, window);
    }

    // Filter out timestamps outside the current window
    const cutoff = now - windowMs;
    window.timestamps = window.timestamps.filter((ts) => ts > cutoff);

    if (window.timestamps.length >= maxRequests) {
      const oldestInWindow = window.timestamps[0] ?? now;
      const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    window.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxRequests - window.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Enforce rate limit. Throws TenantRateLimitExceededError if limit is reached.
   */
  enforceRateLimit(tenantId: string): void {
    const result = this.checkRateLimit(tenantId);
    if (!result.allowed) {
      throw new TenantRateLimitExceededError(tenantId, result.retryAfterSeconds);
    }
  }

  /**
   * Check and enforce session concurrency quota.
   */
  checkConcurrentSessions(tenantId: string, currentActiveSessions: number): void {
    const quota = this.getTenantQuota(tenantId);
    if (currentActiveSessions >= quota.maxConcurrentSessions) {
      throw new TenantQuotaExceededError({
        tenantId,
        quotaName: "maxConcurrentSessions",
        limit: quota.maxConcurrentSessions,
        current: currentActiveSessions,
      });
    }
  }

  /**
   * Check and enforce daily spend limit.
   */
  checkDailySpend(tenantId: string, currentSpendUsd: number, additionalCostUsd = 0): void {
    const quota = this.getTenantQuota(tenantId);
    if (currentSpendUsd + additionalCostUsd > quota.maxDailyTokenSpendUsd) {
      throw new TenantQuotaExceededError({
        tenantId,
        quotaName: "maxDailyTokenSpendUsd",
        limit: quota.maxDailyTokenSpendUsd,
        current: currentSpendUsd + additionalCostUsd,
      });
    }
  }
}
