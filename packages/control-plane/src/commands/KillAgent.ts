/**
 * @file KillAgent.ts
 * @description Hard emergency kill command handler bypassing graceful stops and forcibly releasing locks.
 */

export interface KillAgentCommandInput {
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly reason: string;
  readonly triggeredBy: string;
}

export interface KillAgentCommandResult {
  readonly success: boolean;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly killedAt: Date;
  readonly error?: string;
}

export class KillAgentCommand {
  public static validate(input: KillAgentCommandInput): void {
    if (!input.tenantId) throw new Error('KillAgent validation error: tenantId is required');
    if (!input.agentId) throw new Error('KillAgent validation error: agentId is required');
    if (!input.reason) throw new Error('KillAgent validation error: reason is required');
    if (!input.triggeredBy) throw new Error('KillAgent validation error: triggeredBy is required');
  }
}
