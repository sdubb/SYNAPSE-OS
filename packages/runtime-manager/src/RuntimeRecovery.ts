/**
 * @file RuntimeRecovery.ts
 * @description Automated recovery routines, exponential backoff, orphan resource cleanup, and checkpoint recovery for Synapse OS runtimes.
 */

import { EventEmitter } from 'node:events';

export interface RecoveryPolicy {
  readonly maxRecoveryAttempts: number;
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
  readonly backoffMultiplier: number;
  readonly autoResumeFromCheckpoint: boolean;
}

export interface RecoveryContext {
  readonly instanceId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly failureReason: string;
  readonly checkpointData?: Record<string, unknown>;
  readonly cleanupRoutine?: () => Promise<void>;
  readonly restartRoutine?: (resumedCheckpoint?: Record<string, unknown>) => Promise<void>;
}

export interface RecoveryAttemptResult {
  readonly instanceId: string;
  readonly attemptNumber: number;
  readonly success: boolean;
  readonly delayMs: number;
  readonly error?: string;
  readonly timestamp: Date;
}

export class RuntimeRecovery extends EventEmitter {
  private readonly policy: RecoveryPolicy;
  private readonly attemptCounts: Map<string, number> = new Map();
  private readonly activeRecoveries: Set<string> = new Set();

  constructor(policy?: Partial<RecoveryPolicy>) {
    super();
    this.policy = Object.freeze({
      maxRecoveryAttempts: 3,
      initialBackoffMs: 1000,
      maxBackoffMs: 30_000,
      backoffMultiplier: 2.0,
      autoResumeFromCheckpoint: true,
      ...policy,
    });
  }

  public getPolicy(): RecoveryPolicy {
    return this.policy;
  }

  public getAttemptCount(instanceId: string): number {
    return this.attemptCounts.get(instanceId) ?? 0;
  }

  public resetRecovery(instanceId: string): void {
    this.attemptCounts.delete(instanceId);
    this.activeRecoveries.delete(instanceId);
  }

  public async executeRecovery(context: RecoveryContext): Promise<RecoveryAttemptResult> {
    const { instanceId } = context;
    if (this.activeRecoveries.has(instanceId)) {
      throw new Error(`Recovery already in progress for instance '${instanceId}'`);
    }

    this.activeRecoveries.add(instanceId);
    const currentAttempt = (this.attemptCounts.get(instanceId) ?? 0) + 1;
    this.attemptCounts.set(instanceId, currentAttempt);

    if (currentAttempt > this.policy.maxRecoveryAttempts) {
      this.activeRecoveries.delete(instanceId);
      this.emit('dead_letter_routed', {
        instanceId,
        sessionId: context.sessionId,
        taskId: context.taskId,
        attempts: currentAttempt - 1,
        reason: `Exceeded max recovery attempts (${this.policy.maxRecoveryAttempts}): ${context.failureReason}`,
        timestamp: new Date(),
      });

      return {
        instanceId,
        attemptNumber: currentAttempt,
        success: false,
        delayMs: 0,
        error: `Exceeded max recovery attempts (${this.policy.maxRecoveryAttempts})`,
        timestamp: new Date(),
      };
    }

    const backoffDelay = this.calculateBackoff(currentAttempt);
    this.emit('recovery_scheduled', {
      instanceId,
      attemptNumber: currentAttempt,
      delayMs: backoffDelay,
      reason: context.failureReason,
      timestamp: new Date(),
    });

    // Wait backoff period
    if (backoffDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }

    try {
      // 1. Run cleanup routine if provided
      if (context.cleanupRoutine) {
        await context.cleanupRoutine();
      }

      // 2. Run restart routine with checkpoint
      if (context.restartRoutine) {
        const checkpoint = this.policy.autoResumeFromCheckpoint ? context.checkpointData : undefined;
        await context.restartRoutine(checkpoint);
      }

      this.activeRecoveries.delete(instanceId);
      const result: RecoveryAttemptResult = {
        instanceId,
        attemptNumber: currentAttempt,
        success: true,
        delayMs: backoffDelay,
        timestamp: new Date(),
      };

      this.emit('recovery_succeeded', result);
      return result;
    } catch (err: unknown) {
      this.activeRecoveries.delete(instanceId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      const result: RecoveryAttemptResult = {
        instanceId,
        attemptNumber: currentAttempt,
        success: false,
        delayMs: backoffDelay,
        error: errorMsg,
        timestamp: new Date(),
      };

      this.emit('recovery_failed', result);
      return result;
    }
  }

  private calculateBackoff(attempt: number): number {
    const raw = this.policy.initialBackoffMs * Math.pow(this.policy.backoffMultiplier, attempt - 1);
    const clamped = Math.min(raw, this.policy.maxBackoffMs);
    // Add jitter +/- 10%
    const jitter = clamped * 0.1 * (Math.random() * 2 - 1);
    return Math.max(0, Math.floor(clamped + jitter));
  }
}
