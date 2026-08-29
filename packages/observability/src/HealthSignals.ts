export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  lastCheckedAt: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthReport {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  components: Record<string, ComponentHealth>;
}

export type HealthCheckFn = () => Promise<{
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
}>;

export class HealthSignals {
  private checkers = new Map<string, HealthCheckFn>();
  private cache: Record<string, ComponentHealth> = {};
  private lastCheckTime = 0;
  private readonly ttlMs: number;

  constructor(ttlMs = 5000) {
    this.ttlMs = ttlMs;
  }

  public registerCheck(name: string, checkFn: HealthCheckFn): void {
    this.checkers.set(name, checkFn);
  }

  public async getHealth(forceFresh = false): Promise<SystemHealthReport> {
    const now = Date.now();

    if (!forceFresh && now - this.lastCheckTime < this.ttlMs && Object.keys(this.cache).length > 0) {
      return this.buildReport(this.cache);
    }

    const componentResults: Record<string, ComponentHealth> = {};

    for (const [name, checkFn] of this.checkers.entries()) {
      const start = Date.now();
      try {
        const res = await checkFn();
        componentResults[name] = {
          name,
          status: res.status,
          latencyMs: Date.now() - start,
          lastCheckedAt: new Date().toISOString(),
          message: res.message,
          details: res.details,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        componentResults[name] = {
          name,
          status: 'UNHEALTHY',
          latencyMs: Date.now() - start,
          lastCheckedAt: new Date().toISOString(),
          message: err.message,
        };
      }
    }

    // Default internal components if none registered yet
    if (Object.keys(componentResults).length === 0) {
      componentResults['runtime'] = {
        name: 'runtime',
        status: 'HEALTHY',
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        message: 'Node.js runtime operational',
      };
    }

    this.cache = componentResults;
    this.lastCheckTime = now;

    return this.buildReport(componentResults);
  }

  private buildReport(components: Record<string, ComponentHealth>): SystemHealthReport {
    let overallStatus: HealthStatus = 'HEALTHY';

    for (const comp of Object.values(components)) {
      if (comp.status === 'UNHEALTHY') {
        overallStatus = 'UNHEALTHY';
        break;
      }
      if (comp.status === 'DEGRADED') {
        overallStatus = 'DEGRADED';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      components,
    };
  }
}

export const healthSignals = new HealthSignals();
