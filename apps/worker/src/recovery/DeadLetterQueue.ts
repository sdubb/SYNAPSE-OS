import { Job } from '../queues/QueueInterface.js';

export interface DeadLetterItem<T = Record<string, unknown>> {
  job: Job<T>;
  failedAt: string;
  error: {
    message: string;
    stack?: string;
  };
  replayedCount: number;
}

export class DeadLetterQueue<T = Record<string, unknown>> {
  private items = new Map<string, DeadLetterItem<T>>();

  public recordFailure(job: Job<T>, error: Error): void {
    this.items.set(job.id, {
      job,
      failedAt: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
      },
      replayedCount: 0,
    });
  }

  public getItems(): DeadLetterItem<T>[] {
    return Array.from(this.items.values());
  }

  public getItem(jobId: string): DeadLetterItem<T> | null {
    return this.items.get(jobId) ?? null;
  }

  public remove(jobId: string): boolean {
    return this.items.delete(jobId);
  }

  public clear(): void {
    this.items.clear();
  }

  public size(): number {
    return this.items.size;
  }
}
