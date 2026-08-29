export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: boolean;
}

export class RetryPolicy {
  private readonly config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelayMs: config.initialDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 60000,
      backoffFactor: config.backoffFactor ?? 2,
      jitter: config.jitter ?? true,
    };
  }

  /**
   * Calculates backoff delay with optional full jitter.
   * delay = min(maxDelay, initialDelay * (factor ^ attempt))
   */
  public calculateDelay(attempt: number): number {
    const rawDelay = Math.min(
      this.config.maxDelayMs,
      this.config.initialDelayMs * Math.pow(this.config.backoffFactor, attempt)
    );

    if (this.config.jitter) {
      return Math.floor(Math.random() * rawDelay);
    }
    return Math.floor(rawDelay);
  }

  public shouldRetry(attempt: number, error?: Error): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    // Fatal non-retryable error check
    if (error && error.message.includes('NON_RETRYABLE')) {
      return false;
    }
    return true;
  }
}
