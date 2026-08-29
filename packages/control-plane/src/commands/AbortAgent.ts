/**
 * @file AbortAgent.ts
 * @description Immediate cancellation handler for active agent sessions with cancellation tokens and resource teardown.
 */

export interface AbortAgentCommandInput {
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly reason: string;
  readonly triggeredBy: string;
}

export interface AbortAgentCommandResult {
  readonly success: boolean;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly abortedAt: Date;
  readonly error?: string;
}

export class AbortAgentCommand {
  public static validate(input: AbortAgentCommandInput): void {
    if (!input.tenantId) throw new Error('AbortAgent validation error: tenantId is required');
    if (!input.agentId) throw new Error('AbortAgent validation error: agentId is required');
    if (!input.reason) throw new Error('AbortAgent validation error: reason is required');
    if (!input.triggeredBy) throw new Error('AbortAgent validation error: triggeredBy is required');
  }
}
