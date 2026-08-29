/**
 * @file RuntimeHealthMonitor.ts
 * @description Real-time health monitoring, deadlock detection, runaway loop mitigation, and resource watchdog for Synapse OS runtimes.
 */

import { EventEmitter } from 'node:events';

export interface RuntimeHealthConfig {
  readonly pollIntervalMs: number;
  readonly unresponsivenessThresholdMs: number;
  readonly memorySpikeThresholdMb: number;
  readonly maxRapidToolInvocations: number;
  readonly rapidToolWindowMs: number;
  readonly maxLockLeaseTimeMs: number;
}

export interface MonitoredInstanceTarget {
  readonly instanceId: string;
  readonly agentId: string;
  readonly sessionId: string;
  getPid?(): number | undefined;
  getLastActivityTimestamp(): number;
  getMemoryUsageMb(): number;
  getToolCallHistory(): readonly { timestamp: number; toolName: string }[];
  isLocked?(): boolean;
  getLockAcquiredTime?(): number | undefined;
}

export type HealthAnomalyType =
  | 'UNRESPONSIVE'
  | 'MEMORY_SPIKE'
  | 'RUNAWAY_LOOP'
  | 'DEADLOCK'
  | 'CRASHED';

export interface HealthAnomalyEvent {
  readonly instanceId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly anomalyType: HealthAnomalyType;
  readonly details: string;
  readonly timestamp: Date;
  readonly recommendedAction: 'RECOVER' | 'RESTART' | 'TERMINATE' | 'ALERT';
}

export class RuntimeHealthMonitor extends EventEmitter {
  private readonly config: RuntimeHealthConfig;
  private readonly instances: Map<string, MonitoredInstanceTarget> = new Map();
  private timer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config?: Partial<RuntimeHealthConfig>) {
    super();
    this.config = Object.freeze({
      pollIntervalMs: 2000,
      unresponsivenessThresholdMs: 30_000,
      memorySpikeThresholdMb: 2048,
      maxRapidToolInvocations: 50,
      rapidToolWindowMs: 10_000,
      maxLockLeaseTimeMs: 60_000,
      ...config,
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.pollIntervalMs);
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public registerInstance(target: MonitoredInstanceTarget): void {
    this.instances.set(target.instanceId, target);
  }

  public unregisterInstance(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  public performHealthCheck(): void {
    const now = Date.now();

    for (const [instanceId, instance] of this.instances.entries()) {
      try {
        // 1. Check Unresponsiveness
        const lastActivity = instance.getLastActivityTimestamp();
        const inactiveMs = now - lastActivity;
        if (inactiveMs > this.config.unresponsivenessThresholdMs) {
          this.emitAnomaly({
            instanceId,
            agentId: instance.agentId,
            sessionId: instance.sessionId,
            anomalyType: 'UNRESPONSIVE',
            details: `Runtime instance has been unresponsive for ${inactiveMs}ms (threshold: ${this.config.unresponsivenessThresholdMs}ms)`,
            timestamp: new Date(),
            recommendedAction: 'RECOVER',
          });
          continue;
        }

        // 2. Check Memory Spikes
        const memoryMb = instance.getMemoryUsageMb();
        if (memoryMb > this.config.memorySpikeThresholdMb) {
          this.emitAnomaly({
            instanceId,
            agentId: instance.agentId,
            sessionId: instance.sessionId,
            anomalyType: 'MEMORY_SPIKE',
            details: `Runtime memory usage (${memoryMb.toFixed(1)}MB) exceeded maximum threshold (${this.config.memorySpikeThresholdMb}MB)`,
            timestamp: new Date(),
            recommendedAction: 'ALERT',
          });
        }

        // 3. Check Runaway Loops
        const history = instance.getToolCallHistory();
        const recentHistory = history.filter((h) => now - h.timestamp <= this.config.rapidToolWindowMs);
        if (recentHistory.length >= this.config.maxRapidToolInvocations) {
          this.emitAnomaly({
            instanceId,
            agentId: instance.agentId,
            sessionId: instance.sessionId,
            anomalyType: 'RUNAWAY_LOOP',
            details: `Runaway loop detected: ${recentHistory.length} tool calls executed in ${this.config.rapidToolWindowMs}ms`,
            timestamp: new Date(),
            recommendedAction: 'TERMINATE',
          });
        }

        // 4. Check Deadlocks
        if (instance.isLocked && instance.isLocked() && instance.getLockAcquiredTime) {
          const lockTime = instance.getLockAcquiredTime();
          if (lockTime && now - lockTime > this.config.maxLockLeaseTimeMs) {
            this.emitAnomaly({
              instanceId,
              agentId: instance.agentId,
              sessionId: instance.sessionId,
              anomalyType: 'DEADLOCK',
              details: `Deadlock suspected: Workspace lock held for ${now - lockTime}ms (max lease: ${this.config.maxLockLeaseTimeMs}ms)`,
              timestamp: new Date(),
              recommendedAction: 'RECOVER',
            });
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.emitAnomaly({
          instanceId,
          agentId: instance.agentId,
          sessionId: instance.sessionId,
          anomalyType: 'CRASHED',
          details: `Error inspecting runtime instance: ${errorMsg}`,
          timestamp: new Date(),
          recommendedAction: 'RESTART',
        });
      }
    }
  }

  private emitAnomaly(anomaly: HealthAnomalyEvent): void {
    this.emit('anomaly_detected', anomaly);
  }
}
