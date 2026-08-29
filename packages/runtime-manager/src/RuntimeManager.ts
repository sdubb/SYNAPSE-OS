/**
 * @file RuntimeManager.ts
 * @description Central execution environment manager, process lifecycle orchestrator, and runtime health coordinator for Synapse OS.
 */

import { EventEmitter } from 'node:events';
import { RuntimeInstance, RuntimeStatus } from './RuntimeInstance.js';
import { RuntimeAllocator, TaskPriority, AllocatedSlot } from './RuntimeAllocator.js';
import { RuntimeHealthMonitor, HealthAnomalyEvent } from './RuntimeHealthMonitor.js';
import { RuntimeRecovery } from './RuntimeRecovery.js';
import { WorkspaceIsolation } from './WorkspaceIsolation.js';
import { ResourceLimitsTracker, ResourceLimitsConfig } from './ResourceLimits.js';

export interface CreateRuntimeOptions {
  readonly agentId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly missionId?: string;
  readonly taskId?: string;
  readonly runId?: string;
  readonly attemptId?: string;
  readonly clineSessionId?: string;
  readonly workspaceRoot: string;
  readonly allowedSubdirectories?: readonly string[];
  readonly readOnlyPaths?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly resourceLimits?: Partial<ResourceLimitsConfig>;
  readonly priority?: TaskPriority;
  readonly pid?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeManagerConfig {
  readonly maxGlobalConcurrency?: number;
  readonly maxPerTenantConcurrency?: number;
  readonly maxPerAgentConcurrency?: number;
  readonly pollIntervalMs?: number;
}

export class RuntimeManager extends EventEmitter {
  public readonly allocator: RuntimeAllocator;
  public readonly healthMonitor: RuntimeHealthMonitor;
  public readonly recovery: RuntimeRecovery;

  private readonly runtimes: Map<string, RuntimeInstance> = new Map();
  private readonly slotToInstance: Map<string, string> = new Map();
  private readonly instanceToSlot: Map<string, string> = new Map();
  private isShuttingDown: boolean = false;

  constructor(config?: RuntimeManagerConfig) {
    super();
    this.allocator = new RuntimeAllocator({
      maxGlobalConcurrency: config?.maxGlobalConcurrency,
      maxPerTenantConcurrency: config?.maxPerTenantConcurrency,
      maxPerAgentConcurrency: config?.maxPerAgentConcurrency,
    });

    this.healthMonitor = new RuntimeHealthMonitor({
      pollIntervalMs: config?.pollIntervalMs,
    });

    this.recovery = new RuntimeRecovery();

    this.setupHealthMonitoring();
    this.healthMonitor.start();
  }

  public async createRuntime(options: CreateRuntimeOptions): Promise<RuntimeInstance> {
    if (this.isShuttingDown) {
      throw new Error('RuntimeManager is shutting down; cannot create new runtime instances');
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const slot: AllocatedSlot = await this.allocator.requestSlot({
      requestId,
      tenantId: options.tenantId,
      agentId: options.agentId,
      sessionId: options.sessionId,
      taskId: options.taskId,
      priority: options.priority ?? 'NORMAL',
      requestedAt: Date.now(),
    });

    const instanceId = `inst-${options.sessionId}`;
    const workspaceIsolation = new WorkspaceIsolation({
      workspaceRoot: options.workspaceRoot,
      allowedSubdirectories: options.allowedSubdirectories,
      readOnlyPaths: options.readOnlyPaths,
    });

    const resourceLimits = new ResourceLimitsTracker(options.resourceLimits);

    const instance = new RuntimeInstance({
      instanceId,
      agentId: options.agentId,
      sessionId: options.sessionId,
      tenantId: options.tenantId,
      missionId: options.missionId,
      taskId: options.taskId,
      runId: options.runId,
      attemptId: options.attemptId,
      clineSessionId: options.clineSessionId,
      workspaceIsolation,
      resourceLimits,
      capabilities: options.capabilities,
      pid: options.pid,
      metadata: options.metadata,
    });

    this.runtimes.set(instanceId, instance);
    this.slotToInstance.set(slot.slotId, instanceId);
    this.instanceToSlot.set(instanceId, slot.slotId);

    this.healthMonitor.registerInstance(instance);

    instance.on('status_changed', (payload) => {
      this.emit('instance_status_changed', payload);
    });

    instance.on('terminated', () => {
      this.handleInstanceTerminated(instanceId);
    });

    this.emit('runtime_created', {
      instanceId,
      sessionId: options.sessionId,
      tenantId: options.tenantId,
      agentId: options.agentId,
      taskId: options.taskId,
      runId: options.runId,
      attemptId: options.attemptId,
    });
    return instance;
  }

  public getRuntime(instanceId: string): RuntimeInstance | undefined {
    return this.runtimes.get(instanceId);
  }

  public getRuntimeBySession(sessionId: string): RuntimeInstance | undefined {
    const instanceId = `inst-${sessionId}`;
    return this.runtimes.get(instanceId);
  }

  public getRuntimeByTask(taskId: string): RuntimeInstance | undefined {
    for (const inst of this.runtimes.values()) {
      if (inst.taskId === taskId) return inst;
    }
    return undefined;
  }

  public getRuntimeByAttempt(attemptId: string): RuntimeInstance | undefined {
    for (const inst of this.runtimes.values()) {
      if (inst.attemptId === attemptId) return inst;
    }
    return undefined;
  }

  public listRuntimes(filter?: {
    tenantId?: string;
    agentId?: string;
    missionId?: string;
    taskId?: string;
    runId?: string;
    status?: RuntimeStatus;
  }): readonly RuntimeInstance[] {
    const result: RuntimeInstance[] = [];
    for (const inst of this.runtimes.values()) {
      if (filter?.tenantId && inst.tenantId !== filter.tenantId) continue;
      if (filter?.agentId && inst.agentId !== filter.agentId) continue;
      if (filter?.missionId && inst.missionId !== filter.missionId) continue;
      if (filter?.taskId && inst.taskId !== filter.taskId) continue;
      if (filter?.runId && inst.runId !== filter.runId) continue;
      if (filter?.status && inst.getStatus() !== filter.status) continue;
      result.push(inst);
    }
    return Object.freeze(result);
  }

  public pauseRuntime(instanceId: string): void {
    const instance = this.runtimes.get(instanceId);
    if (!instance) {
      throw new Error(`Runtime instance '${instanceId}' not found`);
    }
    instance.pause();
    this.emit('runtime_paused', { instanceId });
  }

  public resumeRuntime(instanceId: string): void {
    const instance = this.runtimes.get(instanceId);
    if (!instance) {
      throw new Error(`Runtime instance '${instanceId}' not found`);
    }
    instance.resume();
    this.emit('runtime_resumed', { instanceId });
  }

  public async terminateRuntime(instanceId: string, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
    const instance = this.runtimes.get(instanceId);
    if (!instance) {
      return false;
    }

    // Terminating emits 'terminated', which invokes handleInstanceTerminated exactly once
    instance.terminate(signal);
    this.handleInstanceTerminated(instanceId);
    return true;
  }

  public async emergencyKillAll(tenantId?: string): Promise<number> {
    let killedCount = 0;
    for (const instance of this.runtimes.values()) {
      if (!tenantId || instance.tenantId === tenantId) {
        instance.terminate('SIGKILL');
        killedCount++;
      }
    }
    return killedCount;
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.allocator.setDraining(true);
    this.healthMonitor.stop();

    const terminations = Array.from(this.runtimes.keys()).map((id) => this.terminateRuntime(id, 'SIGTERM'));
    await Promise.allSettled(terminations);

    this.runtimes.clear();
    this.slotToInstance.clear();
    this.instanceToSlot.clear();
    this.emit('shutdown_complete');
  }

  private handleInstanceTerminated(instanceId: string): void {
    if (!this.runtimes.has(instanceId)) {
      return; // Idempotency guard: prevents double cleanup
    }

    this.healthMonitor.unregisterInstance(instanceId);
    const slotId = this.instanceToSlot.get(instanceId);
    if (slotId) {
      this.allocator.releaseSlot(slotId);
      this.slotToInstance.delete(slotId);
      this.instanceToSlot.delete(instanceId);
    }
    this.runtimes.delete(instanceId);
    this.emit('runtime_terminated', { instanceId });
  }

  private setupHealthMonitoring(): void {
    this.healthMonitor.on('anomaly_detected', async (anomaly: HealthAnomalyEvent) => {
      this.emit('anomaly_detected', anomaly);

      if (anomaly.recommendedAction === 'TERMINATE') {
        await this.terminateRuntime(anomaly.instanceId, 'SIGKILL');
      } else if (anomaly.recommendedAction === 'RECOVER' || anomaly.recommendedAction === 'RESTART') {
        const inst = this.runtimes.get(anomaly.instanceId);
        if (inst) {
          await this.recovery.executeRecovery({
            instanceId: anomaly.instanceId,
            agentId: anomaly.agentId,
            sessionId: anomaly.sessionId,
            taskId: inst.taskId,
            failureReason: anomaly.details,
            cleanupRoutine: async () => {
              inst.releaseLock();
            },
            restartRoutine: async () => {
              inst.setStatus('READY');
              inst.recordActivity();
            },
          });
        }
      }
    });
  }
}
