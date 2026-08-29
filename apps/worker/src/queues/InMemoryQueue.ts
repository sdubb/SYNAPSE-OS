import { randomUUID } from 'node:crypto';
import { IQueue, Job, JobOptions } from './QueueInterface.js';
import { RetryPolicy } from '../recovery/RetryPolicy.js';
import { DeadLetterQueue } from '../recovery/DeadLetterQueue.js';

export class InMemoryQueue<T = Record<string, unknown>> implements IQueue<T> {
  public readonly name: string;
  private pendingJobs: Job<T>[] = [];
  private inFlightJobs = new Map<string, Job<T>>();
  private readonly retryPolicy: RetryPolicy;
  private readonly dlq: DeadLetterQueue<T>;

  constructor(name: string, retryPolicy?: RetryPolicy, dlq?: DeadLetterQueue<T>) {
    this.name = name;
    this.retryPolicy = retryPolicy ?? new RetryPolicy();
    this.dlq = dlq ?? new DeadLetterQueue<T>();
  }

  public async enqueue(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
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
      createdAt: new Date().toISOString(),
      scheduledAt: now + delay,
    };

    this.pendingJobs.push(job);
    this.sortPending();
    return job;
  }

  public async dequeue(): Promise<Job<T> | null> {
    const now = Date.now();
    const readyIdx = this.pendingJobs.findIndex((j) => j.scheduledAt <= now);
    if (readyIdx === -1) {
      return null;
    }

    const [job] = this.pendingJobs.splice(readyIdx, 1);
    job.attempts += 1;
    this.inFlightJobs.set(job.id, job);
    return job;
  }

  public async ack(jobId: string): Promise<void> {
    this.inFlightJobs.delete(jobId);
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
      job.scheduledAt = Date.now() + delay;
      this.pendingJobs.push(job);
      this.sortPending();
      return { willRetry: true, nextAttemptAt: job.scheduledAt };
    } else {
      this.dlq.recordFailure(job, error);
      return { willRetry: false };
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

  public async size(): Promise<{ pending: number; inFlight: number }> {
    return {
      pending: this.pendingJobs.length,
      inFlight: this.inFlightJobs.size,
    };
  }

  public async clear(): Promise<void> {
    this.pendingJobs = [];
    this.inFlightJobs.clear();
  }

  public getDLQ(): DeadLetterQueue<T> {
    return this.dlq;
  }
}
