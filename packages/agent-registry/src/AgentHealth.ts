/**
 * @file AgentHealth.ts
 * @description Real-time health signals, heartbeat monitoring, degradation detection, and session metrics for Synapse OS agents.
 */

import { EventEmitter } from 'node:events';

export type AgentHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'OFFLINE' | 'DRAINING';

export interface HealthThresholds {
  readonly heartbeatTimeoutMs: number;
  readonly maxConsecutiveFailures: number;
  readonly maxErrorRatePercentage: number;
  readonly maxActiveSessions: number;
  readonly highLatencyThresholdMs: number;
}

export interface HealthMetrics {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly activeSessions: number;
  readonly averageLatencyMs: number;
  readonly consecutiveFailures: number;
  readonly uptimeSeconds: number;
  readonly lastHeartbeatAt?: Date;
  readonly lastErrorAt?: Date;
  readonly lastErrorMessage?: string;
}

export interface HealthCheckResult {
  readonly agentId: string;
  readonly status: AgentHealthStatus;
  readonly reason: string;
  readonly metrics: HealthMetrics;
  readonly isSchedulable: boolean;
  readonly timestamp: Date;
}

export class AgentHealthTracker extends EventEmitter {
  private readonly agentId: string;
  private readonly thresholds: HealthThresholds;
  private status: AgentHealthStatus;
  private totalExecutions: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;
  private activeSessions: number = 0;
  private consecutiveFailures: number = 0;
  private latencySamples: number[] = [];
  private readonly maxLatencySamples = 50;
  private startedAt: Date = new Date();
  private lastHeartbeatAt?: Date;
  private lastErrorAt?: Date;
  private lastErrorMessage?: string;

  constructor(agentId: string, customThresholds?: Partial<HealthThresholds>) {
    super();
    this.agentId = agentId;
    this.status = 'HEALTHY';
    this.thresholds = Object.freeze({
      heartbeatTimeoutMs: 30_000,
      maxConsecutiveFailures: 3,
      maxErrorRatePercentage: 25.0,
      maxActiveSessions: 10,
      highLatencyThresholdMs: 60_000,
      ...customThresholds,
    });
    this.recordHeartbeat();
  }

  public getAgentId(): string {
    return this.agentId;
  }

  public getStatus(): AgentHealthStatus {
    this.evaluateHealth();
    return this.status;
  }

  public recordHeartbeat(): void {
    this.lastHeartbeatAt = new Date();
    if (this.status === 'OFFLINE') {
      this.setStatus('HEALTHY', 'Received heartbeat from previously offline agent');
    }
  }

  public recordSessionStarted(): void {
    this.activeSessions += 1;
    this.evaluateHealth();
  }

  public recordSessionCompleted(latencyMs: number): void {
    this.totalExecutions += 1;
    this.successfulExecutions += 1;
    this.consecutiveFailures = 0;
    this.activeSessions = Math.max(0, this.activeSessions - 1);
    this.recordLatency(latencyMs);
    this.evaluateHealth();
  }

  public recordSessionFailed(error: Error | string, latencyMs?: number): void {
    this.totalExecutions += 1;
    this.failedExecutions += 1;
    this.consecutiveFailures += 1;
    this.activeSessions = Math.max(0, this.activeSessions - 1);
    this.lastErrorAt = new Date();
    this.lastErrorMessage = typeof error === 'string' ? error : error.message;
    if (latencyMs !== undefined) {
      this.recordLatency(latencyMs);
    }
    this.evaluateHealth();
  }

  public setDraining(draining: boolean): void {
    if (draining) {
      this.setStatus('DRAINING', 'Agent marked as draining for maintenance or retirement');
    } else {
      this.evaluateHealth();
    }
  }

  public getMetrics(): HealthMetrics {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    const avgLatency = this.latencySamples.length > 0
      ? this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
      : 0;

    return {
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      activeSessions: this.activeSessions,
      averageLatencyMs: Math.round(avgLatency),
      consecutiveFailures: this.consecutiveFailures,
      uptimeSeconds,
      lastHeartbeatAt: this.lastHeartbeatAt,
      lastErrorAt: this.lastErrorAt,
      lastErrorMessage: this.lastErrorMessage,
    };
  }

  public evaluateHealth(): HealthCheckResult {
    const now = Date.now();
    let computedStatus: AgentHealthStatus = 'HEALTHY';
    let reason = 'Agent is operating normally within all health parameters';

    if (this.status === 'DRAINING') {
      return {
        agentId: this.agentId,
        status: 'DRAINING',
        reason: 'Agent is draining active workload',
        metrics: this.getMetrics(),
        isSchedulable: false,
        timestamp: new Date(),
      };
    }

    if (this.lastHeartbeatAt && now - this.lastHeartbeatAt.getTime() > this.thresholds.heartbeatTimeoutMs) {
      computedStatus = 'OFFLINE';
      reason = `Heartbeat timed out (${now - this.lastHeartbeatAt.getTime()}ms > ${this.thresholds.heartbeatTimeoutMs}ms)`;
    } else if (this.consecutiveFailures >= this.thresholds.maxConsecutiveFailures) {
      computedStatus = 'UNHEALTHY';
      reason = `Excessive consecutive failures (${this.consecutiveFailures} >= ${this.thresholds.maxConsecutiveFailures}): ${this.lastErrorMessage ?? 'unknown error'}`;
    } else if (this.activeSessions >= this.thresholds.maxActiveSessions) {
      computedStatus = 'DEGRADED';
      reason = `Max concurrent session limit reached (${this.activeSessions}/${this.thresholds.maxActiveSessions})`;
    } else if (this.totalExecutions >= 5) {
      const errorRate = (this.failedExecutions / this.totalExecutions) * 100;
      if (errorRate > this.thresholds.maxErrorRatePercentage) {
        computedStatus = 'DEGRADED';
        reason = `Error rate (${errorRate.toFixed(1)}%) exceeds threshold (${this.thresholds.maxErrorRatePercentage}%)`;
      }
    }

    if (this.status !== computedStatus) {
      this.setStatus(computedStatus, reason);
    }

    const isSchedulable = computedStatus === 'HEALTHY' || computedStatus === 'DEGRADED';

    return {
      agentId: this.agentId,
      status: this.status,
      reason,
      metrics: this.getMetrics(),
      isSchedulable,
      timestamp: new Date(),
    };
  }

  private setStatus(newStatus: AgentHealthStatus, reason: string): void {
    const oldStatus = this.status;
    this.status = newStatus;
    this.emit('health_changed', {
      agentId: this.agentId,
      oldStatus,
      newStatus,
      reason,
      timestamp: new Date(),
    });
  }

  private recordLatency(latencyMs: number): void {
    this.latencySamples.push(latencyMs);
    if (this.latencySamples.length > this.maxLatencySamples) {
      this.latencySamples.shift();
    }
  }
}
