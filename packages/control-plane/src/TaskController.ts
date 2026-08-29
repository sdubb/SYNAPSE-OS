/**
 * @file TaskController.ts
 * @description Task state machine, DAG dependency resolution, cycle detection, and automated retries for Synapse OS.
 */

import { EventEmitter } from 'node:events';
import {
  TaskStateRecord,
  TaskStatus,
  TaskStateValidator,
  TaskAttemptRecord,
  TaskArtifact,
  TaskVerificationSummary,
} from './state/TaskState.js';
import { StateReducer, SynapseEventEnvelope } from './state/StateReducer.js';
import {
  TaskStateError,
  DependencyCycleError,
} from './errors/ControlPlaneError.js';

export interface CreateTaskOptions {
  readonly taskId?: string;
  readonly missionId?: string;
  readonly parentTaskId?: string;
  readonly tenantId: string;
  readonly title: string;
  readonly description: string;
  readonly dependencies?: readonly string[];
  readonly assignedAgentId?: string;
  readonly assignedTeamId?: string;
  readonly priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  readonly maxRetries?: number;
}

export class TaskController extends EventEmitter {
  private readonly tasks: Map<string, TaskStateRecord> = new Map();

  constructor() {
    super();
  }

  public createTask(options: CreateTaskOptions): TaskStateRecord {
    const taskId = options.taskId ?? `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (this.tasks.has(taskId)) {
      throw new TaskStateError(`Task with ID '${taskId}' already exists`, { taskId, tenantId: options.tenantId });
    }

    // Verify dependencies exist
    if (options.dependencies) {
      for (const depId of options.dependencies) {
        if (!this.tasks.has(depId)) {
          throw new TaskStateError(`Prerequisite dependency task '${depId}' does not exist`, {
            taskId,
            tenantId: options.tenantId,
          });
        }
      }
    }

    const task = TaskStateValidator.createInitial(
      taskId,
      options.tenantId,
      options.title,
      options.description,
      options.dependencies ?? [],
      options.parentTaskId,
      options.priority ?? 'NORMAL',
      options.maxRetries ?? 3,
      options.missionId
    );

    this.tasks.set(taskId, task);

    // Update dependents lists on prerequisite tasks
    if (options.dependencies) {
      for (const depId of options.dependencies) {
        const depTask = this.tasks.get(depId)!;
        const updatedDependents = Array.from(new Set([...depTask.dependents, taskId]));
        this.tasks.set(depId, {
          ...depTask,
          dependents: Object.freeze(updatedDependents),
        });
      }
    }

    // Validate no cycle created
    this.validateNoCycles();

    // Advance to PLANNED
    this.emitEvent(task, 'TASK_STATUS_CHANGED', { newStatus: 'PLANNED', reason: 'Task initialized' });

    // If no dependencies, automatically queue
    if (!options.dependencies || options.dependencies.length === 0) {
      const current = this.tasks.get(taskId)!;
      this.emitEvent(current, 'TASK_STATUS_CHANGED', { newStatus: 'QUEUED', reason: 'No dependencies; ready to execute' });
    }

    return this.getTaskOrThrow(taskId);
  }

  public addDependency(taskId: string, prerequisiteTaskId: string): void {
    const task = this.getTaskOrThrow(taskId);
    const depTask = this.getTaskOrThrow(prerequisiteTaskId);

    if (task.dependencies.includes(prerequisiteTaskId)) {
      return;
    }

    const newDeps = Object.freeze([...task.dependencies, prerequisiteTaskId]);
    this.tasks.set(taskId, {
      ...task,
      dependencies: newDeps,
    });

    const newDependents = Object.freeze([...depTask.dependents, taskId]);
    this.tasks.set(prerequisiteTaskId, {
      ...depTask,
      dependents: newDependents,
    });

    try {
      this.validateNoCycles();
    } catch (err) {
      // Rollback on cycle
      this.tasks.set(taskId, task);
      this.tasks.set(prerequisiteTaskId, depTask);
      throw err;
    }
  }

  public setTaskStatus(taskId: string, newStatus: TaskStatus, reason?: string): void {
    const task = this.getTaskOrThrow(taskId);
    TaskStateValidator.validateTransition(task.status, newStatus);

    if (newStatus === 'QUEUED' || newStatus === 'RUNNING') {
      const unfulfilled = this.getUnfulfilledDependencies(taskId);
      if (unfulfilled.length > 0) {
        throw new TaskStateError(
          `Cannot advance task '${taskId}' to '${newStatus}': Prerequisite tasks not completed: ${unfulfilled.join(', ')}`,
          { taskId, tenantId: task.tenantId }
        );
      }
    }

    this.emitEvent(task, 'TASK_STATUS_CHANGED', {
      oldStatus: task.status,
      newStatus,
      reason: reason ?? `Status changed to ${newStatus}`,
    });

    // If completed, check downstream dependents
    if (newStatus === 'COMPLETED') {
      this.checkAndQueueDependents(taskId);
    }
  }

  public recordAttempt(taskId: string, attempt: TaskAttemptRecord): void {
    const task = this.getTaskOrThrow(taskId);
    this.emitEvent(task, 'TASK_ATTEMPT_RECORDED', { attempt });
  }

  public attachArtifact(taskId: string, artifact: TaskArtifact): void {
    const task = this.getTaskOrThrow(taskId);
    this.emitEvent(task, 'TASK_ARTIFACT_ATTACHED', { artifact });
  }

  public recordVerification(taskId: string, verification: TaskVerificationSummary): void {
    const task = this.getTaskOrThrow(taskId);
    this.emitEvent(task, 'TASK_VERIFICATION_RECORDED', { verification });

    if (verification.passed && task.status === 'VERIFYING') {
      this.setTaskStatus(taskId, 'COMPLETED', `Verification ${verification.verifierType} passed`);
    } else if (!verification.passed && task.status === 'VERIFYING') {
      this.setTaskStatus(taskId, 'FAILED', `Verification ${verification.verifierType} failed: ${verification.details}`);
    }
  }

  public async retryTask(taskId: string, force: boolean = false): Promise<{ success: boolean; delayMs: number; error?: string }> {
    const task = this.getTaskOrThrow(taskId);

    if (task.status !== 'FAILED' && !force) {
      throw new TaskStateError(`Cannot retry task '${taskId}' in status '${task.status}'`, { taskId });
    }

    if (task.retryPolicy.currentRetry >= task.retryPolicy.maxRetries && !force) {
      return {
        success: false,
        delayMs: 0,
        error: `Exceeded max retry attempts (${task.retryPolicy.maxRetries})`,
      };
    }

    const backoffDelay = Math.min(
      task.retryPolicy.initialBackoffMs * Math.pow(task.retryPolicy.backoffMultiplier, task.retryPolicy.currentRetry),
      task.retryPolicy.maxBackoffMs
    );

    this.emitEvent(task, 'TASK_RETRY_INCREMENTED', { delayMs: backoffDelay });

    setTimeout(() => {
      try {
        const current = this.getTaskOrThrow(taskId);
        if (current.status === 'RETRY') {
          this.setTaskStatus(taskId, 'QUEUED', `Retry attempt #${current.retryPolicy.currentRetry} ready`);
        }
      } catch (err) {
        this.emit('task_retry_error', { taskId, error: String(err) });
      }
    }, backoffDelay);

    return {
      success: true,
      delayMs: backoffDelay,
    };
  }

  public getTask(taskId: string): TaskStateRecord | undefined {
    return this.tasks.get(taskId);
  }

  public getTaskOrThrow(taskId: string): TaskStateRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskStateError(`Task '${taskId}' not found`, { taskId });
    }
    return task;
  }

  public getReadyTasks(tenantId?: string): readonly TaskStateRecord[] {
    const ready: TaskStateRecord[] = [];
    for (const task of this.tasks.values()) {
      if (tenantId && task.tenantId !== tenantId) continue;
      if (task.status === 'QUEUED') {
        ready.push(task);
      }
    }
    return Object.freeze(ready);
  }

  public listTasks(filter?: {
    tenantId?: string;
    parentTaskId?: string;
    assignedAgentId?: string;
    status?: TaskStatus;
  }): readonly TaskStateRecord[] {
    const result: TaskStateRecord[] = [];
    for (const task of this.tasks.values()) {
      if (filter?.tenantId && task.tenantId !== filter.tenantId) continue;
      if (filter?.parentTaskId && task.parentTaskId !== filter.parentTaskId) continue;
      if (filter?.assignedAgentId && task.assignedAgentId !== filter.assignedAgentId) continue;
      if (filter?.status && task.status !== filter.status) continue;
      result.push(task);
    }
    return Object.freeze(result);
  }

  public getTopologicalOrder(): readonly string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const task = this.tasks.get(id);
      if (task) {
        for (const dep of task.dependencies) {
          visit(dep);
        }
        order.push(id);
      }
    };

    for (const id of this.tasks.keys()) {
      visit(id);
    }

    return Object.freeze(order);
  }

  private getUnfulfilledDependencies(taskId: string): string[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    const unfulfilled: string[] = [];
    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'COMPLETED') {
        unfulfilled.push(depId);
      }
    }
    return unfulfilled;
  }

  private checkAndQueueDependents(completedTaskId: string): void {
    const completedTask = this.tasks.get(completedTaskId);
    if (!completedTask) return;

    for (const dependentId of completedTask.dependents) {
      const dep = this.tasks.get(dependentId);
      if (dep && (dep.status === 'PLANNED' || dep.status === 'BACKLOG')) {
        const unfulfilled = this.getUnfulfilledDependencies(dependentId);
        if (unfulfilled.length === 0) {
          this.setTaskStatus(dependentId, 'QUEUED', `All prerequisite dependencies resolved`);
        }
      }
    }
  }

  private validateNoCycles(): void {
    const enum NodeColor { WHITE, GRAY, BLACK }
    const colors = new Map<string, NodeColor>();
    const stack: string[] = [];

    for (const id of this.tasks.keys()) {
      colors.set(id, NodeColor.WHITE);
    }

    const dfs = (u: string) => {
      colors.set(u, NodeColor.GRAY);
      stack.push(u);

      const task = this.tasks.get(u);
      if (task) {
        for (const v of task.dependencies) {
          const color = colors.get(v) ?? NodeColor.WHITE;
          if (color === NodeColor.GRAY) {
            const cyclePath = stack.slice(stack.indexOf(v)).concat(v);
            throw new DependencyCycleError(cyclePath);
          }
          if (color === NodeColor.WHITE) {
            dfs(v);
          }
        }
      }

      stack.pop();
      colors.set(u, NodeColor.BLACK);
    };

    for (const id of this.tasks.keys()) {
      if (colors.get(id) === NodeColor.WHITE) {
        dfs(id);
      }
    }
  }

  private emitEvent(task: TaskStateRecord, eventType: string, payload: Record<string, unknown>): void {
    const envelope: SynapseEventEnvelope = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      correlationId: task.taskId,
      tenantId: task.tenantId,
      taskId: task.taskId,
      timestamp: new Date(),
      payload,
    };

    const updated = StateReducer.reduceTaskState(task, envelope);
    this.tasks.set(task.taskId, updated);
    this.emit('task_updated', { task: updated, event: envelope });
  }
}
