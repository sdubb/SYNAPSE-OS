import { runtimeTelemetry, healthSignals, metrics, logger } from '@synapse/observability';

export class TelemetryWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  public start(intervalMs = 15000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(async () => {
      try {
        const snapshot = runtimeTelemetry.getSnapshot();
        metrics.activeAgents.set({}, snapshot.activeHandles); // Update active handles gauge

        // Ping health check signals
        const health = await healthSignals.getHealth(true);
        if (health.status !== 'HEALTHY') {
          logger.warn(`System health status degraded: ${health.status}`, { components: health.components });
        }
      } catch (err) {
        logger.error('TelemetryWorker execution error:', err instanceof Error ? err : new Error(String(err)));
      }
    }, intervalMs);

    logger.info('TelemetryWorker background monitoring service started.');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
