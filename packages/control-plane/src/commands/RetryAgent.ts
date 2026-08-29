/**
 * @file RetryAgent.ts
 * @description Command handler to re-queue failed tasks with backoff delay and retry budget checks.
 */

export interface RetryAgentCommandInput {
  readonly tenantId: string;
  readonly taskId: string;
  readonly agentId?: string;
  readonly reason: string;
  readonly force?: boolean;
}

export interface RetryAgentCommandResult {
  readonly success: boolean;
  readonly taskId: string;
  readonly retryAttempt: number;
  readonly scheduledAt: Date;
  readonly delayMs: number;
  readonly error?: string;
}

export class RetryAgentCommand {
  public static validate(input: RetryAgentCommandInput): void {
    if (!input.tenantId) throw new Error('RetryAgent validation error: tenantId is required');
    if (!input.taskId) throw new Error('RetryAgent validation error: taskId is required');
  }
}
