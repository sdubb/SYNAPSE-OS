/**
 * @file StartAgent.ts
 * @description Command handler to provision workspace, allocate runtime, bind session, and start an agent.
 */

import { TaskPriority } from '@synapse/runtime-manager';

export interface StartAgentCommandInput {
  readonly tenantId: string;
  readonly agentId: string;
  readonly commandId?: string;
  readonly missionId?: string;
  readonly taskId?: string;
  readonly runId?: string;
  readonly attemptId?: string;
  readonly customSessionId?: string;
  readonly workspaceRoot: string;
  readonly allowedSubdirectories?: readonly string[];
  readonly readOnlyPaths?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly priority?: TaskPriority;
  readonly taskGoal?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface StartAgentCommandResult {
  readonly success: boolean;
  readonly executionId: string;
  readonly sessionId: string;
  readonly agentId: string;
  readonly tenantId: string;
  readonly runtimeInstanceId: string;
  readonly workspacePath: string;
  readonly startedAt: Date;
  readonly isExisting?: boolean;
  readonly error?: string;
}

export class StartAgentCommand {
  public static validate(input: StartAgentCommandInput): void {
    if (!input.tenantId) throw new Error('StartAgent validation error: tenantId is required');
    if (!input.agentId) throw new Error('StartAgent validation error: agentId is required');
    if (!input.workspaceRoot) throw new Error('StartAgent validation error: workspaceRoot is required');
  }
}
