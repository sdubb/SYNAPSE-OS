export interface JobCorrelation {
  tenantId?: string;
  missionId?: string;
  agentId?: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  sessionId?: string;
}

export interface JobOptions {
  priority?: number; // Higher number = higher priority
  maxRetries?: number;
  delayMs?: number;
  timeoutMs?: number;
  visibilityTimeoutMs?: number;
  idempotencyKey?: string;
  correlation?: JobCorrelation;
}

export type JobState = 'PENDING' | 'LEASED' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

export interface Job<T = Record<string, unknown>> {
  id: string;
  name: string;
  data: T;
  priority: number;
  attempts: number;
  maxRetries: number;
  timeoutMs: number;
  delayMs: number;
  state: JobState;
  createdAt: string;
  scheduledAt: number;
  leaseExpiresAt?: number;
  idempotencyKey?: string;
  correlation?: JobCorrelation;
  lastError?: string;
  completedAt?: string;
}

export interface IQueue<T = Record<string, unknown>> {
  readonly name: string;
  enqueue(name: string, data: T, options?: JobOptions): Promise<Job<T>>;
  dequeue(): Promise<Job<T> | null>;
  reserve?(visibilityTimeoutMs?: number): Promise<Job<T> | null>;
  ack(jobId: string): Promise<void>;
  nack(jobId: string, error: Error): Promise<{ willRetry: boolean; nextAttemptAt?: number }>;
  retry?(jobId: string, error: Error): Promise<{ willRetry: boolean; nextAttemptAt?: number }>;
  deadLetter?(jobId: string, error: Error): Promise<void>;
  size(): Promise<{ pending: number; inFlight: number; deadLetter?: number }>;
  clear(): Promise<void>;
}
