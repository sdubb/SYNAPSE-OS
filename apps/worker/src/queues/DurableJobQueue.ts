import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { IQueue, Job, JobOptions } from './QueueInterface.js';
import { RetryPolicy } from '../recovery/RetryPolicy.js';
import { DeadLetterQueue } from '../recovery/DeadLetterQueue.js';

export class DurableJobQueue<T = Record<string, unknown>> implements IQueue<T> {
  public readonly name: string;
  private readonly storageDir: string;
  private readonly retryPolicy: RetryPolicy;
  private readonly dlq: DeadLetterQueue<T>;
  private readonly inMemoryCache = new Map<string, Job<T>>();
  private isInitialized = false;

  constructor(
    name: string,
    options?: {
      storageDir?: string;
      retryPolicy?: RetryPolicy;
      dlq?: DeadLetterQueue<T>;
    }
  ) {
    this.name = name;
    this.storageDir = options?.storageDir || path.resolve(process.cwd(), '.synapse_queue', name);
    this.retryPolicy = options?.retryPolicy ?? new RetryPolicy();
    this.dlq = options?.dlq ?? new DeadLetterQueue<T>();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await this.recoverOrphanedJobs();
      this.isInitialized = true;
    } catch (err) {
      console.warn(`[DurableJobQueue] Failed to initialize storage dir ${this.storageDir}:`, err);
    }
  }

  public async enqueue(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    await this.initialize();
    const now = Date.now();
    const delay = options.delayMs ?? 0;

    // Check for idempotency deduplication
    if (options.idempotencyKey) {
      for (const job of this.inMemoryCache.values()) {
        if (job.idempotencyKey === options.idempotencyKey && (job.state === 'PENDING' || job.state === 'LEASED')) {
          return job;
        }
      }
    }

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

    this.inMemoryCache.set(job.id, job);
    await this.persistJob(job);
    return job;
  }

  public async dequeue(): Promise<Job<T> | null> {
    return this.reserve();
  }

  public async reserve(visibilityTimeoutMs = 30000): Promise<Job<T> | null> {
    await this.initialize();
    const now = Date.now();

    // Check for expired leases
    for (const job of this.inMemoryCache.values()) {
      if (job.state === 'LEASED' && job.leaseExpiresAt && job.leaseExpiresAt < now) {
        job.state = 'PENDING';
        job.leaseExpiresAt = undefined;
        await this.persistJob(job);
      }
    }

    // Find ready pending job with highest priority
    const candidates = Array.from(this.inMemoryCache.values())
      .filter((j) => j.state === 'PENDING' && j.scheduledAt <= now)
      .sort((a, b) => {
        if (a.scheduledAt !== b.scheduledAt) return a.scheduledAt - b.scheduledAt;
        return b.priority - a.priority;
      });

    if (candidates.length === 0) {
      return null;
    }

    const job = candidates[0];
    job.attempts += 1;
    job.state = 'LEASED';
    job.leaseExpiresAt = now + visibilityTimeoutMs;

    this.inMemoryCache.set(job.id, job);
    await this.persistJob(job);
    return job;
  }

  public async ack(jobId: string): Promise<void> {
    const job = this.inMemoryCache.get(jobId);
    if (job) {
      job.state = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      this.inMemoryCache.delete(jobId);
      await this.removePersistedJob(jobId);
    }
  }

  public async nack(
    jobId: string,
    error: Error
  ): Promise<{ willRetry: boolean; nextAttemptAt?: number }> {
    const job = this.inMemoryCache.get(jobId);
    if (!job) {
      return { willRetry: false };
    }

    job.lastError = error.message;

    if (this.retryPolicy.shouldRetry(job.attempts, error)) {
      const delay = this.retryPolicy.calculateDelay(job.attempts);
      job.state = 'PENDING';
      job.scheduledAt = Date.now() + delay;
      job.leaseExpiresAt = undefined;
      await this.persistJob(job);
      return { willRetry: true, nextAttemptAt: job.scheduledAt };
    } else {
      job.state = 'DEAD_LETTER';
      this.dlq.recordFailure(job, error);
      this.inMemoryCache.delete(jobId);
      await this.removePersistedJob(jobId);
      return { willRetry: false };
    }
  }

  public async retry(jobId: string, error: Error): Promise<{ willRetry: boolean; nextAttemptAt?: number }> {
    return this.nack(jobId, error);
  }

  public async deadLetter(jobId: string, error: Error): Promise<void> {
    const job = this.inMemoryCache.get(jobId);
    if (job) {
      job.state = 'DEAD_LETTER';
      job.lastError = error.message;
      this.dlq.recordFailure(job, error);
      this.inMemoryCache.delete(jobId);
      await this.removePersistedJob(jobId);
    }
  }

  public async recoverOrphanedJobs(): Promise<number> {
    let count = 0;
    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storageDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const job = JSON.parse(content) as Job<T>;
          if (job.state === 'LEASED') {
            job.state = 'PENDING';
            job.leaseExpiresAt = undefined;
          }
          this.inMemoryCache.set(job.id, job);
          count++;
        }
      }
    } catch {
      // Ignore if dir doesn't exist yet
    }
    return count;
  }

  private async persistJob(job: Job<T>): Promise<void> {
    try {
      const filePath = path.join(this.storageDir, `${job.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(job, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[DurableJobQueue] Failed to persist job ${job.id}:`, err);
    }
  }

  private async removePersistedJob(jobId: string): Promise<void> {
    try {
      const filePath = path.join(this.storageDir, `${jobId}.json`);
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  public async size(): Promise<{ pending: number; inFlight: number; deadLetter: number }> {
    let pending = 0;
    let inFlight = 0;
    for (const job of this.inMemoryCache.values()) {
      if (job.state === 'PENDING') pending++;
      if (job.state === 'LEASED') inFlight++;
    }
    return {
      pending,
      inFlight,
      deadLetter: this.dlq.size(),
    };
  }

  public async clear(): Promise<void> {
    this.inMemoryCache.clear();
    this.dlq.clear();
    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.storageDir, file));
        }
      }
    } catch {}
  }
}
