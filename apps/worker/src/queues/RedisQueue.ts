import { IQueue, Job, JobOptions } from './QueueInterface.js';
import { InMemoryQueue } from './InMemoryQueue.js';

export class RedisQueue<T = Record<string, unknown>> implements IQueue<T> {
  public readonly name: string;
  private readonly fallbackQueue: InMemoryQueue<T>;

  constructor(name: string, _redisUrl?: string) {
    this.name = name;
    this.fallbackQueue = new InMemoryQueue<T>(name);
  }

  public async enqueue(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    return this.fallbackQueue.enqueue(name, data, options);
  }

  public async dequeue(): Promise<Job<T> | null> {
    return this.fallbackQueue.dequeue();
  }

  public async ack(jobId: string): Promise<void> {
    return this.fallbackQueue.ack(jobId);
  }

  public async nack(
    jobId: string,
    error: Error
  ): Promise<{ willRetry: boolean; nextAttemptAt?: number }> {
    return this.fallbackQueue.nack(jobId, error);
  }

  public async size(): Promise<{ pending: number; inFlight: number }> {
    return this.fallbackQueue.size();
  }

  public async clear(): Promise<void> {
    return this.fallbackQueue.clear();
  }
}
