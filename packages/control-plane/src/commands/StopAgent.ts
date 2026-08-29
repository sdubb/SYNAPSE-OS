/**
 * @file StopAgent.ts
 * @description Command handler for graceful stop of an agent after active tool completion or checkpoint save.
 */

export interface StopAgentCommandInput {
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly reason: string;
  readonly timeoutMs?: number;
  readonly saveCheckpoint?: boolean;
}

export interface StopAgentCommandResult {
  readonly success: boolean;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly stoppedAt: Date;
  readonly checkpointSaved: boolean;
  readonly error?: string;
}

export class StopAgentCommand {
  public static validate(input: StopAgentCommandInput): void {
    if (!input.tenantId) throw new Error('StopAgent validation error: tenantId is required');
    if (!input.agentId) throw new Error('StopAgent validation error: agentId is required');
    if (!input.reason) throw new Error('StopAgent validation error: reason is required');
  }
}
