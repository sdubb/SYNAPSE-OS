export interface MemoryUsageMetrics {
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
}

export interface CpuUsageMetrics {
  userMicroseconds: number;
  systemMicroseconds: number;
  percentUsage: number;
}

export interface RuntimeMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  memory: MemoryUsageMetrics;
  cpu: CpuUsageMetrics;
  eventLoopLagMs: number;
  activeHandles: number;
  activeRequests: number;
}

export class RuntimeTelemetry {
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();
  private eventLoopLagMs = 0;
  private lagTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startLagMonitor();
  }

  private startLagMonitor(): void {
    let lastTick = Date.now();
    this.lagTimer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick - 100; // Expected 100ms interval
      this.eventLoopLagMs = Math.max(0, delta);
      lastTick = now;
    }, 100);
    this.lagTimer.unref();
  }

  public getSnapshot(): RuntimeMetricsSnapshot {
    const mem = process.memoryUsage();
    const currentCpu = process.cpuUsage();
    const now = Date.now();

    const elapsedMs = Math.max(1, now - this.lastCpuTime);
    const userDiff = currentCpu.user - this.lastCpuUsage.user;
    const systemDiff = currentCpu.system - this.lastCpuUsage.system;
    const totalCpuMicros = userDiff + systemDiff;

    // Percent across cores: (micros / (elapsedMs * 1000)) * 100
    const percentUsage = Math.min(100, Math.max(0, (totalCpuMicros / (elapsedMs * 1000)) * 100));

    this.lastCpuUsage = currentCpu;
    this.lastCpuTime = now;

    // Active handles/requests safely retrieved
    const getHandles = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles;
    const getRequests = (process as unknown as { _getActiveRequests?: () => unknown[] })._getActiveRequests;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      memory: {
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        rssBytes: mem.rss,
        externalBytes: mem.external,
        arrayBuffersBytes: mem.arrayBuffers,
      },
      cpu: {
        userMicroseconds: currentCpu.user,
        systemMicroseconds: currentCpu.system,
        percentUsage: parseFloat(percentUsage.toFixed(2)),
      },
      eventLoopLagMs: this.eventLoopLagMs,
      activeHandles: typeof getHandles === 'function' ? getHandles().length : 0,
      activeRequests: typeof getRequests === 'function' ? getRequests().length : 0,
    };
  }

  public stop(): void {
    if (this.lagTimer) {
      clearInterval(this.lagTimer);
      this.lagTimer = null;
    }
  }
}

export const runtimeTelemetry = new RuntimeTelemetry();
