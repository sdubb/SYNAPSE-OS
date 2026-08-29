/**
 * @file PauseAgent.ts
 * @description Command handler to suspend agent execution, preserving conversational state and workspace locks.
 */

export interface PauseAgentCommandInput {
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly reason: string;
}

export interface PauseAgentCommandResult {
  readonly success: boolean;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly pausedAt: Date;
  readonly error?: string;
}

export class PauseAgentCommand {
  public static validate(input: PauseAgentCommandInput): void {
    if (!input.tenantId) throw new Error('PauseAgent validation error: tenantId is required');
    if (!input.agentId) throw new Error('PauseAgent validation error: agentId is required');
  }
}
