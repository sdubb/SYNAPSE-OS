export interface JobOptions {
  priority?: number; // Higher number = higher priority
  maxRetries?: number;
  delayMs?: number;
  timeoutMs?: number;
}

export interface Job<T = Record<string, unknown>> {
  id: string;
  name: string;
  data: T;
  priority: number;
  attempts: number;
  maxRetries: number;
  timeoutMs: number;
  delayMs: number;
  createdAt: string;
  scheduledAt: number;
  lastError?: string;
}

export interface IQueue<T = Record<string, unknown>> {
  readonly name: string;
  enqueue(name: string, data: T, options?: JobOptions): Promise<Job<T>>;
  dequeue(): Promise<Job<T> | null>;
  ack(jobId: string): Promise<void>;
  nack(jobId: string, error: Error): Promise<{ willRetry: boolean; nextAttemptAt?: number }>;
  size(): Promise<{ pending: number; inFlight: number }>;
  clear(): Promise<void>;
}
