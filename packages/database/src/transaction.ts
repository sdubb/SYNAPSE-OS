import type { SynapseDatabase } from "./client.js";

export type TransactionScope = Parameters<Parameters<SynapseDatabase["transaction"]>[0]>[0];

export interface TransactionOptions {
  isolationLevel?: "read uncommitted" | "read committed" | "repeatable read" | "serializable";
  maxRetries?: number;
  retryBackoffMs?: number;
}

export class TransactionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TransactionError";
  }
}

export class TransactionRunner {
  constructor(private readonly db: SynapseDatabase) {}

  /**
   * Run a unit of work inside an ACID transaction with optional isolation level and retry semantics.
   */
  async run<T>(
    work: (tx: TransactionScope) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryBackoffMs = options?.retryBackoffMs ?? 100;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        return await this.db.transaction(
          async (tx) => {
            return await work(tx);
          },
          options?.isolationLevel
            ? {
                isolationLevel: options.isolationLevel,
              }
            : undefined
        );
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        // PostgreSQL serialization_failure code is 40001; deadlock_detected is 40P01
        const isRetryable = error.code === "40001" || error.code === "40P01";

        if (isRetryable && attempt < maxRetries) {
          const delay = retryBackoffMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new TransactionError(
          `Transaction failed on attempt ${attempt}/${maxRetries}: ${error.message || String(err)}`,
          err
        );
      }
    }

    throw new TransactionError(`Transaction exceeded maximum retry attempts (${maxRetries}).`);
  }
}
