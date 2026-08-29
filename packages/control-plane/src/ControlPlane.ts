/**
 * @file ControlPlane.ts
 * @description Master central facade coordinating Agent, Session, Task, Team, and Workspace controllers for Synapse OS.
 */

import { EventEmitter } from 'node:events';
import { AgentRegistry } from '@synapse/agent-registry';
import { RuntimeManager, HealthAnomalyEvent } from '@synapse/runtime-manager';
import { WorkspaceController } from './WorkspaceController.js';
import { SessionController } from './SessionController.js';
import { TaskController } from './TaskController.js';
import { TeamController } from './TeamController.js';
import { AgentController } from './AgentController.js';
import { StartAgentCommandInput, StartAgentCommandResult } from './commands/StartAgent.js';
import { StopAgentCommandInput, StopAgentCommandResult } from './commands/StopAgent.js';
import { AbortAgentCommandInput, AbortAgentCommandResult } from './commands/AbortAgent.js';
import { PauseAgentCommandInput, PauseAgentCommandResult } from './commands/PauseAgent.js';
import { ResumeAgentCommandInput, ResumeAgentCommandResult } from './commands/ResumeAgent.js';
import { RetryAgentCommand, RetryAgentCommandInput, RetryAgentCommandResult } from './commands/RetryAgent.js';
import { KillAgentCommandInput, KillAgentCommandResult } from './commands/KillAgent.js';
import { TaskStateError } from './errors/ControlPlaneError.js';

export interface ControlPlaneConfig {
  readonly maxGlobalConcurrency?: number;
  readonly maxPerTenantConcurrency?: number;
  readonly defaultWorkspaceBaseDir?: string;
}

export interface ControlPlaneHealthStatus {
  readonly status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  readonly activeAgents: number;
  readonly activeSessions: number;
  readonly activeRuntimes: number;
  readonly queuedTasks: number;
  readonly timestamp: Date;
}

export class ControlPlane extends EventEmitter {
  public readonly registry: AgentRegistry;
  public readonly runtimeManager: RuntimeManager;
  public readonly workspaces: WorkspaceController;
  public readonly sessions: SessionController;
  public readonly tasks: TaskController;
  public readonly teams: TeamController;
  public readonly agents: AgentController;

  private readonly config: ControlPlaneConfig;
  public readonly isInitialized: boolean;

  constructor(config?: ControlPlaneConfig) {
    super();
    this.config = Object.freeze({
      maxGlobalConcurrency: 50,
      maxPerTenantConcurrency: 10,
      defaultWorkspaceBaseDir: process.cwd(),
      ...config,
    });

    this.registry = new AgentRegistry(true);
    this.runtimeManager = new RuntimeManager({
      maxGlobalConcurrency: this.config.maxGlobalConcurrency,
      maxPerTenantConcurrency: this.config.maxPerTenantConcurrency,
    });
    this.workspaces = new WorkspaceController();
    this.sessions = new SessionController();
    this.tasks = new TaskController();
    this.teams = new TeamController();

    this.agents = new AgentController({
      registry: this.registry,
      runtimeManager: this.runtimeManager,
      workspaceController: this.workspaces,
      sessionController: this.sessions,
    });

    this.wireInternalEvents();
    this.isInitialized = true;
  }

  public async startAgent(input: StartAgentCommandInput): Promise<StartAgentCommandResult> {
    return this.agents.startAgent(input);
  }

  public async pauseAgent(input: PauseAgentCommandInput): Promise<PauseAgentCommandResult> {
    return this.agents.pauseAgent(input);
  }

  public async resumeAgent(input: ResumeAgentCommandInput): Promise<ResumeAgentCommandResult> {
    return this.agents.resumeAgent(input);
  }

  public async stopAgent(input: StopAgentCommandInput): Promise<StopAgentCommandResult> {
    return this.agents.stopAgent(input);
  }

  public async abortAgent(input: AbortAgentCommandInput): Promise<AbortAgentCommandResult> {
    return this.agents.abortAgent(input);
  }

  public async killAgent(input: KillAgentCommandInput): Promise<KillAgentCommandResult> {
    return this.agents.killAgent(input);
  }

  public async retryTask(input: RetryAgentCommandInput): Promise<RetryAgentCommandResult> {
    RetryAgentCommand.validate(input);
    const result = await this.tasks.retryTask(input.taskId, input.force);
    return {
      success: result.success,
      taskId: input.taskId,
      retryAttempt: 1,
      scheduledAt: new Date(),
      delayMs: result.delayMs,
      error: result.error,
    };
  }

  public async executeTask(
    taskId: string,
    options?: {
      agentId?: string;
      workspaceRoot?: string;
      customSessionId?: string;
    }
  ): Promise<StartAgentCommandResult> {
    const task = this.tasks.getTaskOrThrow(taskId);

    if (task.status !== 'QUEUED' && task.status !== 'PLANNED') {
      throw new TaskStateError(`Task '${taskId}' is in status '${task.status}' and cannot be started`, {
        taskId,
        tenantId: task.tenantId,
      });
    }

    // Determine target agent
    const agentId = options?.agentId ?? task.assignedAgentId ?? 'synapse-general-developer';
    const workspaceRoot = options?.workspaceRoot ?? this.config.defaultWorkspaceBaseDir ?? process.cwd();

    // Advance task status to RUNNING
    this.tasks.setTaskStatus(taskId, 'RUNNING', `Starting execution with agent '${agentId}'`);

    const result = await this.agents.startAgent({
      tenantId: task.tenantId,
      agentId,
      taskId: task.taskId,
      customSessionId: options?.customSessionId,
      workspaceRoot,
      taskGoal: task.description,
      priority: task.priority,
    });

    this.tasks.recordAttempt(taskId, {
      attemptNumber: task.attempts.length + 1,
      sessionId: result.sessionId,
      agentId,
      startedAt: result.startedAt,
      exitStatus: 'SUCCESS',
      outputSummary: 'Execution started successfully',
    });

    return result;
  }

  public getHealth(): ControlPlaneHealthStatus {
    const activeAgents = this.agents.listAgents().filter((a) => a.status === 'RUNNING').length;
    const activeSessions = this.sessions.listSessions({ status: 'ACTIVE' }).length;
    const activeRuntimes = this.runtimeManager.listRuntimes({ status: 'BUSY' }).length;
    const queuedTasks = this.tasks.getReadyTasks().length;

    let status: ControlPlaneHealthStatus['status'] = 'HEALTHY';
    if (queuedTasks > 50 || activeSessions > 40) {
      status = 'DEGRADED';
    }

    return {
      status,
      activeAgents,
      activeSessions,
      activeRuntimes,
      queuedTasks,
      timestamp: new Date(),
    };
  }

  public async emergencyStopAll(tenantId?: string): Promise<{ killedAgents: number; killedRuntimes: number }> {
    const killedRuntimes = await this.runtimeManager.emergencyKillAll(tenantId);
    let killedAgents = 0;

    for (const agent of this.agents.listAgents(tenantId)) {
      if (agent.status === 'RUNNING' || agent.status === 'PAUSED' || agent.status === 'INITIALIZING') {
        await this.agents.killAgent({
          tenantId: agent.tenantId,
          agentId: agent.agentId,
          reason: 'Emergency system shutdown requested',
          triggeredBy: 'SYSTEM_SUPERVISOR',
        });
        killedAgents++;
      }
    }

    this.emit('emergency_stop_executed', { tenantId, killedAgents, killedRuntimes, timestamp: new Date() });
    return { killedAgents, killedRuntimes };
  }

  public async shutdown(): Promise<void> {
    this.emit('control_plane_shutting_down');
    await this.emergencyStopAll();
    await this.runtimeManager.shutdown();
    this.emit('control_plane_terminated');
  }

  private wireInternalEvents(): void {
    this.sessions.on('session_updated', ({ session }) => {
      this.emit('session_updated', session);
    });

    this.tasks.on('task_updated', ({ task }) => {
      this.emit('task_updated', task);
    });

    this.agents.on('agent_state_changed', ({ state }) => {
      this.emit('agent_state_changed', state);
    });

    this.runtimeManager.on('anomaly_detected', (anomaly: HealthAnomalyEvent) => {
      this.emit('runtime_anomaly', anomaly);
    });
  }
}
