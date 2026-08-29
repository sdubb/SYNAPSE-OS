/**
 * @file ResourceLimits.ts
 * @description Token budgets, execution timeouts, memory limits, and cost tracking for Synapse OS runtimes.
 */

import { EventEmitter } from 'node:events';

export interface ResourceLimitsConfig {
  readonly maxTokensPerSession: number;
  readonly maxTokensPerTask: number;
  readonly maxPromptTokens: number;
  readonly maxCompletionTokens: number;
  readonly maxCostUsd: number;
  readonly executionTimeoutMs: number;
  readonly idleTimeoutMs: number;
  readonly maxMemoryMb: number;
  readonly maxDiskWriteBytes: number;
  readonly softLimitWarningPercent: number; // e.g. 80%
}

export interface ResourceUsageSnapshot {
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalTokens: number;
  readonly totalCostUsd: number;
  readonly totalDiskBytesWritten: number;
  readonly executionDurationMs: number;
  readonly toolCallCount: number;
  readonly isSoftLimitReached: boolean;
  readonly isHardLimitExceeded: boolean;
  readonly limitBreachedReason?: string;
}

export class ResourceLimitsTracker extends EventEmitter {
  private readonly config: ResourceLimitsConfig;
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private costUsd: number = 0;
  private diskBytesWritten: number = 0;
  private toolCallCount: number = 0;
  private readonly startTime: number;
  private lastActivityTime: number;
  private softLimitEmitted: boolean = false;
  private hardLimitBreached: boolean = false;
  private hardLimitReason?: string;

  constructor(config?: Partial<ResourceLimitsConfig>) {
    super();
    this.config = Object.freeze({
      maxTokensPerSession: 200_000,
      maxTokensPerTask: 100_000,
      maxPromptTokens: 150_000,
      maxCompletionTokens: 50_000,
      maxCostUsd: 10.0,
      executionTimeoutMs: 600_000, // 10 minutes
      idleTimeoutMs: 120_000,      // 2 minutes
      maxMemoryMb: 2048,
      maxDiskWriteBytes: 500 * 1024 * 1024, // 500MB
      softLimitWarningPercent: 80,
      ...config,
    });
    this.startTime = Date.now();
    this.lastActivityTime = Date.now();
  }

  public getConfig(): ResourceLimitsConfig {
    return this.config;
  }

  public recordTokenUsage(prompt: number, completion: number, estimatedCostUsd?: number): void {
    this.promptTokens += prompt;
    this.completionTokens += completion;
    this.lastActivityTime = Date.now();

    if (estimatedCostUsd !== undefined) {
      this.costUsd += estimatedCostUsd;
    } else {
      // Default estimate based on Claude 3.5 Sonnet standard pricing ($3/M in, $15/M out)
      const costEstimate = (prompt * 3.0 + completion * 15.0) / 1_000_000;
      this.costUsd += costEstimate;
    }

    this.evaluateLimits();
  }

  public recordDiskWrite(bytes: number): void {
    this.diskBytesWritten += bytes;
    this.lastActivityTime = Date.now();
    this.evaluateLimits();
  }

  public recordToolCall(): void {
    this.toolCallCount += 1;
    this.lastActivityTime = Date.now();
  }

  public touch(): void {
    this.lastActivityTime = Date.now();
  }

  public getSnapshot(): ResourceUsageSnapshot {
    const duration = Date.now() - this.startTime;
    return {
      totalPromptTokens: this.promptTokens,
      totalCompletionTokens: this.completionTokens,
      totalTokens: this.promptTokens + this.completionTokens,
      totalCostUsd: Number(this.costUsd.toFixed(4)),
      totalDiskBytesWritten: this.diskBytesWritten,
      executionDurationMs: duration,
      toolCallCount: this.toolCallCount,
      isSoftLimitReached: this.isSoftLimitExceeded(),
      isHardLimitExceeded: this.hardLimitBreached,
      limitBreachedReason: this.hardLimitReason,
    };
  }

  public checkQuotaForTokens(incomingTokens: number): { allowed: boolean; reason?: string } {
    const projectedTokens = this.promptTokens + this.completionTokens + incomingTokens;
    if (projectedTokens > this.config.maxTokensPerSession) {
      return {
        allowed: false,
        reason: `Exceeds max tokens per session limit (${projectedTokens} > ${this.config.maxTokensPerSession})`,
      };
    }
    return { allowed: true };
  }

  public evaluateLimits(): { ok: boolean; reason?: string } {
    const now = Date.now();
    const duration = now - this.startTime;
    const idleDuration = now - this.lastActivityTime;
    const totalTokens = this.promptTokens + this.completionTokens;

    // Check Execution Timeout
    if (duration > this.config.executionTimeoutMs) {
      return this.triggerHardBreach(
        `Execution timeout exceeded (${duration}ms > ${this.config.executionTimeoutMs}ms)`
      );
    }

    // Check Idle Timeout
    if (idleDuration > this.config.idleTimeoutMs) {
      return this.triggerHardBreach(
        `Idle timeout exceeded (${idleDuration}ms > ${this.config.idleTimeoutMs}ms)`
      );
    }

    // Check Token Limit
    if (totalTokens >= this.config.maxTokensPerSession) {
      return this.triggerHardBreach(
        `Token limit breached (${totalTokens} >= ${this.config.maxTokensPerSession})`
      );
    }

    // Check Cost Limit
    if (this.costUsd >= this.config.maxCostUsd) {
      return this.triggerHardBreach(
        `Cost budget exceeded ($${this.costUsd.toFixed(2)} >= $${this.config.maxCostUsd.toFixed(2)})`
      );
    }

    // Check Disk Limit
    if (this.diskBytesWritten >= this.config.maxDiskWriteBytes) {
      return this.triggerHardBreach(
        `Disk write quota exceeded (${this.diskBytesWritten} bytes >= ${this.config.maxDiskWriteBytes} bytes)`
      );
    }

    // Check Soft Limit
    if (!this.softLimitEmitted && this.isSoftLimitExceeded()) {
      this.softLimitEmitted = true;
      this.emit('soft_limit_warning', {
        usage: this.getSnapshot(),
        thresholdPercent: this.config.softLimitWarningPercent,
        timestamp: new Date(),
      });
    }

    return { ok: true };
  }

  private isSoftLimitExceeded(): boolean {
    const ratio = this.config.softLimitWarningPercent / 100;
    const totalTokens = this.promptTokens + this.completionTokens;
    return (
      totalTokens >= this.config.maxTokensPerSession * ratio ||
      this.costUsd >= this.config.maxCostUsd * ratio ||
      (Date.now() - this.startTime) >= this.config.executionTimeoutMs * ratio
    );
  }

  private triggerHardBreach(reason: string): { ok: boolean; reason: string } {
    if (!this.hardLimitBreached) {
      this.hardLimitBreached = true;
      this.hardLimitReason = reason;
      this.emit('hard_limit_exceeded', {
        reason,
        usage: this.getSnapshot(),
        timestamp: new Date(),
      });
    }
    return { ok: false, reason };
  }
}
