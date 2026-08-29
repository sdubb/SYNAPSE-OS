/**
 * @file AgentController.ts
 * @description Complete lifecycle controller for agents (create, start, pause, resume, abort, stop, kill) for Synapse OS.
 */

import { EventEmitter } from 'node:events';
import { AgentRegistry } from '@synapse/agent-registry';
import { RuntimeManager } from '@synapse/runtime-manager';
import { WorkspaceController } from './WorkspaceController.js';
import { SessionController } from './SessionController.js';
import {
  AgentStateRecord,
  AgentStatus,
  AgentStateValidator,
} from './state/AgentState.js';
import { StateReducer, SynapseEventEnvelope } from './state/StateReducer.js';
import {
  AgentLifecycleError,
} from './errors/ControlPlaneError.js';
import { StartAgentCommand, StartAgentCommandInput, StartAgentCommandResult } from './commands/StartAgent.js';
import { StopAgentCommand, StopAgentCommandInput, StopAgentCommandResult } from './commands/StopAgent.js';
import { AbortAgentCommand, AbortAgentCommandInput, AbortAgentCommandResult } from './commands/AbortAgent.js';
import { PauseAgentCommand, PauseAgentCommandInput, PauseAgentCommandResult } from './commands/PauseAgent.js';
import { ResumeAgentCommand, ResumeAgentCommandInput, ResumeAgentCommandResult } from './commands/ResumeAgent.js';
import { KillAgentCommand, KillAgentCommandInput, KillAgentCommandResult } from './commands/KillAgent.js';

export interface AgentControllerDeps {
  readonly registry: AgentRegistry;
  readonly runtimeManager: RuntimeManager;
  readonly workspaceController: WorkspaceController;
  readonly sessionController: SessionController;
}

export class AgentController extends EventEmitter {
  private readonly registry: AgentRegistry;
  private readonly runtimeManager: RuntimeManager;
  private readonly workspaceController: WorkspaceController;
  private readonly sessionController: SessionController;
  private readonly agentStates: Map<string, AgentStateRecord> = new Map();

  constructor(deps: AgentControllerDeps) {
    super();
    this.registry = deps.registry;
    this.runtimeManager = deps.runtimeManager;
    this.workspaceController = deps.workspaceController;
    this.sessionController = deps.sessionController;
  }

  public registerAgentState(agentId: string, tenantId: string): AgentStateRecord {
    if (this.agentStates.has(agentId)) {
      return this.agentStates.get(agentId)!;
    }

    const state = AgentStateValidator.createInitial(agentId, tenantId);
    this.agentStates.set(agentId, state);
    this.emit('agent_state_initialized', state);
    return state;
  }

  public async startAgent(input: StartAgentCommandInput): Promise<StartAgentCommandResult> {
    StartAgentCommand.validate(input);

    const agent = this.registry.getOrThrow(input.agentId);
    let state = this.getOrCreateState(input.agentId, input.tenantId);

    // Check if agent is already active in this exact session (idempotency)
    if (
      state.status === 'RUNNING' &&
      input.customSessionId &&
      state.currentSessionId === input.customSessionId &&
      state.runtimeInstanceId
    ) {
      return {
        success: true,
        executionId: `exec-existing-${state.currentSessionId}`,
        sessionId: state.currentSessionId,
        agentId: input.agentId,
        tenantId: input.tenantId,
        runtimeInstanceId: state.runtimeInstanceId,
        workspacePath: state.allocatedWorkspacePath || input.workspaceRoot,
        startedAt: state.lastActiveAt || new Date(),
        isExisting: true,
      };
    }

    // Validate state transition to RUNNING
    AgentStateValidator.validateTransition(state.status, 'INITIALIZING');
    this.transitionStatus(state, 'INITIALIZING', 'Starting agent execution');

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. Provision Workspace
      const sessionId = input.customSessionId ?? `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const workspacePath = await this.workspaceController.provisionWorkspace({
        tenantId: input.tenantId,
        sessionId,
        taskId: input.taskId,
        baseDirectory: input.workspaceRoot,
      });

      // 2. Lock Workspace
      this.workspaceController.acquireLock(workspacePath, input.agentId, 'EXCLUSIVE', 300_000);

      // 3. Create Session Record
      const session = this.sessionController.createSession({
        sessionId,
        tenantId: input.tenantId,
        agentId: input.agentId,
        workspacePath,
        taskId: input.taskId,
      });

      // 4. Allocate Runtime Instance
      const runtimeInstance = await this.runtimeManager.createRuntime({
        agentId: input.agentId,
        sessionId,
        tenantId: input.tenantId,
        missionId: input.missionId,
        taskId: input.taskId,
        runId: input.runId,
        attemptId: input.attemptId,
        workspaceRoot: workspacePath,
        allowedSubdirectories: input.allowedSubdirectories,
        readOnlyPaths: input.readOnlyPaths,
        capabilities: input.capabilities,
        priority: input.priority,
        metadata: input.metadata,
      });

      // 5. Update agent state to RUNNING
      state = this.getAgentStateOrThrow(input.agentId);
      this.emitEvent(state, 'AGENT_STATUS_CHANGED', {
        newStatus: 'RUNNING',
        reason: 'Runtime allocated and session activated',
        sessionId: session.sessionId,
        taskId: input.taskId,
        runtimeInstanceId: runtimeInstance.instanceId,
        workspacePath,
      });

      agent.healthTracker.recordSessionStarted();

      const result: StartAgentCommandResult = {
        success: true,
        executionId,
        sessionId: session.sessionId,
        agentId: input.agentId,
        tenantId: input.tenantId,
        runtimeInstanceId: runtimeInstance.instanceId,
        workspacePath,
        startedAt: new Date(),
      };

      this.emit('agent_started', result);
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      state = this.getAgentStateOrThrow(input.agentId);
      this.emitEvent(state, 'AGENT_STATUS_CHANGED', {
        newStatus: 'FAILED',
        reason: `Failed to start agent: ${errorMsg}`,
      });
      agent.healthTracker.recordSessionFailed(errorMsg);

      throw new AgentLifecycleError(`Failed to start agent '${input.agentId}': ${errorMsg}`, {
        agentId: input.agentId,
        tenantId: input.tenantId,
        taskId: input.taskId,
      });
    }
  }

  public async pauseAgent(input: PauseAgentCommandInput): Promise<PauseAgentCommandResult> {
    PauseAgentCommand.validate(input);

    const state = this.getAgentStateOrThrow(input.agentId);
    AgentStateValidator.validateTransition(state.status, 'PAUSED');

    if (state.runtimeInstanceId) {
      this.runtimeManager.pauseRuntime(state.runtimeInstanceId);
    }

    if (state.currentSessionId) {
      this.sessionController.setSessionStatus(state.currentSessionId, 'PAUSED', input.reason);
    }

    this.transitionStatus(state, 'PAUSED', input.reason);

    const result: PauseAgentCommandResult = {
      success: true,
      agentId: input.agentId,
      sessionId: state.currentSessionId,
      pausedAt: new Date(),
    };

    this.emit('agent_paused', result);
    return result;
  }

  public async resumeAgent(input: ResumeAgentCommandInput): Promise<ResumeAgentCommandResult> {
    ResumeAgentCommand.validate(input);

    const state = this.getAgentStateOrThrow(input.agentId);
    AgentStateValidator.validateTransition(state.status, 'RUNNING');

    if (state.runtimeInstanceId) {
      this.runtimeManager.resumeRuntime(state.runtimeInstanceId);
    }

    if (state.currentSessionId) {
      this.sessionController.setSessionStatus(state.currentSessionId, 'ACTIVE', input.reason ?? 'Resumed');
    }

    this.transitionStatus(state, 'RUNNING', input.reason ?? 'Resumed execution');

    const result: ResumeAgentCommandResult = {
      success: true,
      agentId: input.agentId,
      sessionId: state.currentSessionId,
      resumedAt: new Date(),
    };

    this.emit('agent_resumed', result);
    return result;
  }

  public async stopAgent(input: StopAgentCommandInput): Promise<StopAgentCommandResult> {
    StopAgentCommand.validate(input);

    const state = this.getAgentStateOrThrow(input.agentId);
    let checkpointSaved = false;

    if (input.saveCheckpoint && state.allocatedWorkspacePath) {
      await this.workspaceController.createSnapshot(state.allocatedWorkspacePath);
      checkpointSaved = true;
    }

    if (state.allocatedWorkspacePath) {
      this.workspaceController.releaseLock(state.allocatedWorkspacePath, input.agentId);
    }

    if (state.runtimeInstanceId) {
      await this.runtimeManager.terminateRuntime(state.runtimeInstanceId, 'SIGTERM');
    }

    if (state.currentSessionId) {
      this.sessionController.setSessionStatus(state.currentSessionId, 'COMPLETED', input.reason);
    }

    this.transitionStatus(state, 'STOPPED', input.reason);

    const result: StopAgentCommandResult = {
      success: true,
      agentId: input.agentId,
      sessionId: state.currentSessionId,
      stoppedAt: new Date(),
      checkpointSaved,
    };

    this.emit('agent_stopped', result);
    return result;
  }

  public async abortAgent(input: AbortAgentCommandInput): Promise<AbortAgentCommandResult> {
    AbortAgentCommand.validate(input);

    const state = this.getAgentStateOrThrow(input.agentId);

    if (state.allocatedWorkspacePath) {
      this.workspaceController.releaseLock(state.allocatedWorkspacePath, input.agentId);
    }

    if (state.runtimeInstanceId) {
      await this.runtimeManager.terminateRuntime(state.runtimeInstanceId, 'SIGTERM');
    }

    if (state.currentSessionId) {
      this.sessionController.setSessionStatus(state.currentSessionId, 'ABORTED', input.reason);
    }

    this.transitionStatus(state, 'ABORTED', input.reason, input.triggeredBy);

    const result: AbortAgentCommandResult = {
      success: true,
      agentId: input.agentId,
      sessionId: state.currentSessionId,
      abortedAt: new Date(),
    };

    this.emit('agent_aborted', result);
    return result;
  }

  public async killAgent(input: KillAgentCommandInput): Promise<KillAgentCommandResult> {
    KillAgentCommand.validate(input);

    const state = this.getAgentStateOrThrow(input.agentId);

    if (state.allocatedWorkspacePath) {
      this.workspaceController.releaseLock(state.allocatedWorkspacePath, input.agentId);
    }

    if (state.runtimeInstanceId) {
      await this.runtimeManager.terminateRuntime(state.runtimeInstanceId, 'SIGKILL');
    }

    if (state.currentSessionId) {
      this.sessionController.setSessionStatus(state.currentSessionId, 'FAILED', `Emergency killed: ${input.reason}`);
    }

    this.transitionStatus(state, 'KILLED', input.reason, input.triggeredBy);

    const result: KillAgentCommandResult = {
      success: true,
      agentId: input.agentId,
      sessionId: state.currentSessionId,
      killedAt: new Date(),
    };

    this.emit('agent_killed', result);
    return result;
  }

  public getAgentState(agentId: string): AgentStateRecord | undefined {
    return this.agentStates.get(agentId);
  }

  public getAgentStateOrThrow(agentId: string): AgentStateRecord {
    const state = this.agentStates.get(agentId);
    if (!state) {
      throw new AgentLifecycleError(`Agent state for '${agentId}' not found`, { agentId });
    }
    return state;
  }

  public listAgents(tenantId?: string): readonly AgentStateRecord[] {
    const list: AgentStateRecord[] = [];
    for (const st of this.agentStates.values()) {
      if (!tenantId || st.tenantId === tenantId) {
        list.push(st);
      }
    }
    return Object.freeze(list);
  }

  private getOrCreateState(agentId: string, tenantId: string): AgentStateRecord {
    const existing = this.agentStates.get(agentId);
    if (existing) return existing;
    return this.registerAgentState(agentId, tenantId);
  }

  private transitionStatus(state: AgentStateRecord, newStatus: AgentStatus, reason: string, triggeredBy?: string): void {
    this.emitEvent(state, 'AGENT_STATUS_CHANGED', {
      newStatus,
      reason,
      triggeredBy,
    });
  }

  private emitEvent(state: AgentStateRecord, eventType: string, payload: Record<string, unknown>): void {
    const envelope: SynapseEventEnvelope = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      correlationId: state.agentId,
      tenantId: state.tenantId,
      agentId: state.agentId,
      sessionId: state.currentSessionId,
      taskId: state.currentTaskId,
      timestamp: new Date(),
      payload,
    };

    const updated = StateReducer.reduceAgentState(state, envelope);
    this.agentStates.set(state.agentId, updated);
    this.emit('agent_state_changed', { state: updated, event: envelope });
  }
}
