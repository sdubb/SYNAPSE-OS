import { AuditEngine } from '@synapse/audit-engine';
import { logger } from '@synapse/observability';

export class AuditWorker {
  private readonly auditEngine: AuditEngine;
  private isRunning = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;

  constructor(auditEngine: AuditEngine) {
    this.auditEngine = auditEngine;
  }

  public start(flushIntervalMs = 5000, retentionIntervalMs = 3600000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Periodic flush timer
    this.flushTimer = setInterval(async () => {
      try {
        await this.auditEngine.flush();
      } catch (err) {
        logger.error('AuditWorker flush failed:', err instanceof Error ? err : new Error(String(err)));
      }
    }, flushIntervalMs);

    // Periodic retention & archival timer
    this.retentionTimer = setInterval(async () => {
      try {
        const results = await this.auditEngine.applyRetention();
        if (results.length > 0) {
          logger.info(`AuditWorker executed retention for ${results.length} policies.`);
        }
      } catch (err) {
        logger.error('AuditWorker retention check failed:', err instanceof Error ? err : new Error(String(err)));
      }
    }, retentionIntervalMs);

    logger.info('AuditWorker background service started.');
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.retentionTimer) {
      clearInterval(this.retentionTimer);
      this.retentionTimer = null;
    }
    await this.auditEngine.flush();
  }
}
