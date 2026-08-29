/**
 * @file ResumeAgent.ts
 * @description Command handler to resume a paused agent execution.
 */

export interface ResumeAgentCommandInput {
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly reason?: string;
}

export interface ResumeAgentCommandResult {
  readonly success: boolean;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly resumedAt: Date;
  readonly error?: string;
}

export class ResumeAgentCommand {
  public static validate(input: ResumeAgentCommandInput): void {
    if (!input.tenantId) throw new Error('ResumeAgent validation error: tenantId is required');
    if (!input.agentId) throw new Error('ResumeAgent validation error: agentId is required');
  }
}
