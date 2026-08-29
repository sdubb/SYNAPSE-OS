import { randomUUID } from 'node:crypto';
import { IQueue, Job, JobOptions } from './QueueInterface.js';
import { RetryPolicy } from '../recovery/RetryPolicy.js';
import { DeadLetterQueue } from '../recovery/DeadLetterQueue.js';

export class InMemoryQueue<T = Record<string, unknown>> implements IQueue<T> {
  public readonly name: string;
  private pendingJobs: Job<T>[] = [];
  private inFlightJobs = new Map<string, Job<T>>();
  private readonly idempotencyKeys = new Set<string>();
  private readonly retryPolicy: RetryPolicy;
  private readonly dlq: DeadLetterQueue<T>;

  constructor(name: string, retryPolicy?: RetryPolicy, dlq?: DeadLetterQueue<T>) {
    this.name = name;
    this.retryPolicy = retryPolicy ?? new RetryPolicy();
    this.dlq = dlq ?? new DeadLetterQueue<T>();
  }

  public async enqueue(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    if (options.idempotencyKey && this.idempotencyKeys.has(options.idempotencyKey)) {
      // Find existing job
      const existing =
        this.pendingJobs.find((j) => j.idempotencyKey === options.idempotencyKey) ||
        Array.from(this.inFlightJobs.values()).find((j) => j.idempotencyKey === options.idempotencyKey);
      if (existing) return existing;
    }

    if (options.idempotencyKey) {
      this.idempotencyKeys.add(options.idempotencyKey);
    }

    const now = Date.now();
    const delay = options.delayMs ?? 0;

    const job: Job<T> = {
      id: randomUUID(),
      name,
      data,
      priority: options.priority ?? 0,
      attempts: 0,
      maxRetries: options.maxRetries ?? 3,
      timeoutMs: options.timeoutMs ?? 30000,
      delayMs: delay,
      state: 'PENDING',
      createdAt: new Date().toISOString(),
      scheduledAt: now + delay,
      idempotencyKey: options.idempotencyKey,
      correlation: options.correlation,
    };

    this.pendingJobs.push(job);
    this.sortPending();
    return job;
  }

  public async dequeue(): Promise<Job<T> | null> {
    return this.reserve();
  }

  public async reserve(visibilityTimeoutMs = 30000): Promise<Job<T> | null> {
    const now = Date.now();

    // Check for expired leases and return them to pending
    for (const [id, job] of this.inFlightJobs) {
      if (job.leaseExpiresAt && job.leaseExpiresAt < now) {
        this.inFlightJobs.delete(id);
        job.state = 'PENDING';
        this.pendingJobs.push(job);
        this.sortPending();
      }
    }

    const readyIdx = this.pendingJobs.findIndex((j) => j.scheduledAt <= now);
    if (readyIdx === -1) {
      return null;
    }

    const [job] = this.pendingJobs.splice(readyIdx, 1);
    job.attempts += 1;
    job.state = 'LEASED';
    job.leaseExpiresAt = now + visibilityTimeoutMs;
    this.inFlightJobs.set(job.id, job);
    return job;
  }

  public async ack(jobId: string): Promise<void> {
    const job = this.inFlightJobs.get(jobId);
    if (job) {
      job.state = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      this.inFlightJobs.delete(jobId);
    }
  }

  public async nack(
    jobId: string,
    error: Error
  ): Promise<{ willRetry: boolean; nextAttemptAt?: number }> {
    const job = this.inFlightJobs.get(jobId);
    if (!job) {
      return { willRetry: false };
    }

    this.inFlightJobs.delete(jobId);
    job.lastError = error.message;

    if (this.retryPolicy.shouldRetry(job.attempts, error)) {
      const delay = this.retryPolicy.calculateDelay(job.attempts);
      job.state = 'PENDING';
      job.scheduledAt = Date.now() + delay;
      job.leaseExpiresAt = undefined;
      this.pendingJobs.push(job);
      this.sortPending();
      return { willRetry: true, nextAttemptAt: job.scheduledAt };
    } else {
      job.state = 'DEAD_LETTER';
      this.dlq.recordFailure(job, error);
      return { willRetry: false };
    }
  }

  public async retry(jobId: string, error: Error): Promise<{ willRetry: boolean; nextAttemptAt?: number }> {
    return this.nack(jobId, error);
  }

  public async deadLetter(jobId: string, error: Error): Promise<void> {
    const job = this.inFlightJobs.get(jobId);
    if (job) {
      this.inFlightJobs.delete(jobId);
      job.state = 'DEAD_LETTER';
      job.lastError = error.message;
      this.dlq.recordFailure(job, error);
    }
  }

  private sortPending(): void {
    // Sort by scheduledAt asc, then by priority desc
    this.pendingJobs.sort((a, b) => {
      if (a.scheduledAt !== b.scheduledAt) {
        return a.scheduledAt - b.scheduledAt;
      }
      return b.priority - a.priority;
    });
  }

  public async size(): Promise<{ pending: number; inFlight: number; deadLetter: number }> {
    return {
      pending: this.pendingJobs.length,
      inFlight: this.inFlightJobs.size,
      deadLetter: this.dlq.size(),
    };
  }

  public async clear(): Promise<void> {
    this.pendingJobs = [];
    this.inFlightJobs.clear();
    this.idempotencyKeys.clear();
    this.dlq.clear();
  }

  public getDLQ(): DeadLetterQueue<T> {
    return this.dlq;
  }
}
