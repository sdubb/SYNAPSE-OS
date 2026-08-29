/**
 * @file RuntimeInstance.ts
 * @description Instance tracker, process abstraction, stream pipe, and lock coordinator for running Cline worker threads/processes.
 */

import { EventEmitter } from 'node:events';
import { WorkspaceIsolation } from './WorkspaceIsolation.js';
import { ResourceLimitsTracker } from './ResourceLimits.js';
import { MonitoredInstanceTarget } from './RuntimeHealthMonitor.js';

export type RuntimeStatus =
  | 'INITIALIZING'
  | 'READY'
  | 'BUSY'
  | 'PAUSED'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'ERROR';

export interface RuntimeInstanceConfig {
  readonly instanceId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly tenantId: string;
  readonly workspaceIsolation: WorkspaceIsolation;
  readonly resourceLimits?: ResourceLimitsTracker;
  readonly pid?: number;
  readonly metadata?: Record<string, unknown>;
}

export class RuntimeInstance extends EventEmitter implements MonitoredInstanceTarget {
  public readonly instanceId: string;
  public readonly agentId: string;
  public readonly sessionId: string;
  public readonly taskId?: string;
  public readonly tenantId: string;
  public readonly workspaceIsolation: WorkspaceIsolation;
  public readonly resourceLimits: ResourceLimitsTracker;
  public readonly pid?: number;
  public readonly metadata: Readonly<Record<string, unknown>>;

  private status: RuntimeStatus = 'INITIALIZING';
  private lastActivityTimestamp: number = Date.now();
  private toolCallHistory: Array<{ timestamp: number; toolName: string }> = [];
  private locked: boolean = false;
  private lockAcquiredTime?: number;
  private lockReason?: string;
  private memoryUsageMb: number = 64; // Base memory estimate
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];
  private readonly maxLogLines = 1000;

  constructor(config: RuntimeInstanceConfig) {
    super();
    this.instanceId = config.instanceId;
    this.agentId = config.agentId;
    this.sessionId = config.sessionId;
    this.taskId = config.taskId;
    this.tenantId = config.tenantId;
    this.workspaceIsolation = config.workspaceIsolation;
    this.resourceLimits = config.resourceLimits ?? new ResourceLimitsTracker();
    this.pid = config.pid;
    this.metadata = Object.freeze(config.metadata ? { ...config.metadata } : {});

    this.resourceLimits.on('hard_limit_exceeded', (payload) => {
      this.emit('resource_breach', payload);
      this.terminate('SIGTERM');
    });

    this.setStatus('READY');
  }

  public getStatus(): RuntimeStatus {
    return this.status;
  }

  public setStatus(newStatus: RuntimeStatus): void {
    const old = this.status;
    this.status = newStatus;
    this.lastActivityTimestamp = Date.now();
    this.emit('status_changed', { instanceId: this.instanceId, oldStatus: old, newStatus });
  }

  public getPid(): number | undefined {
    return this.pid;
  }

  public getLastActivityTimestamp(): number {
    return this.lastActivityTimestamp;
  }

  public recordActivity(): void {
    this.lastActivityTimestamp = Date.now();
    this.resourceLimits.touch();
  }

  public recordToolCall(toolName: string): void {
    const now = Date.now();
    this.toolCallHistory.push({ timestamp: now, toolName });
    if (this.toolCallHistory.length > 200) {
      this.toolCallHistory.shift();
    }
    this.lastActivityTimestamp = now;
    this.resourceLimits.recordToolCall();
  }

  public getToolCallHistory(): readonly { timestamp: number; toolName: string }[] {
    return Object.freeze([...this.toolCallHistory]);
  }

  public getMemoryUsageMb(): number {
    return this.memoryUsageMb;
  }

  public updateMemoryUsage(mb: number): void {
    this.memoryUsageMb = mb;
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public getLockAcquiredTime(): number | undefined {
    return this.lockAcquiredTime;
  }

  public getLockReason(): string | undefined {
    return this.lockReason;
  }

  public acquireLock(reason: string): boolean {
    if (this.locked) {
      return false;
    }
    this.locked = true;
    this.lockAcquiredTime = Date.now();
    this.lockReason = reason;
    this.emit('lock_acquired', { instanceId: this.instanceId, reason, timestamp: this.lockAcquiredTime });
    return true;
  }

  public releaseLock(): boolean {
    if (!this.locked) {
      return false;
    }
    this.locked = false;
    this.lockAcquiredTime = undefined;
    this.lockReason = undefined;
    this.emit('lock_released', { instanceId: this.instanceId, timestamp: Date.now() });
    return true;
  }

  public appendStdout(chunk: string): void {
    this.stdoutBuffer.push(chunk);
    if (this.stdoutBuffer.length > this.maxLogLines) {
      this.stdoutBuffer.shift();
    }
    this.recordActivity();
    this.emit('stdout', chunk);
  }

  public appendStderr(chunk: string): void {
    this.stderrBuffer.push(chunk);
    if (this.stderrBuffer.length > this.maxLogLines) {
      this.stderrBuffer.shift();
    }
    this.recordActivity();
    this.emit('stderr', chunk);
  }

  public getStdoutLogs(): readonly string[] {
    return Object.freeze([...this.stdoutBuffer]);
  }

  public getStderrLogs(): readonly string[] {
    return Object.freeze([...this.stderrBuffer]);
  }

  public pause(): void {
    if (this.status === 'TERMINATED' || this.status === 'TERMINATING') {
      throw new Error(`Cannot pause runtime instance in status '${this.status}'`);
    }
    this.setStatus('PAUSED');
  }

  public resume(): void {
    if (this.status !== 'PAUSED') {
      throw new Error(`Cannot resume runtime instance that is not PAUSED (current: '${this.status}')`);
    }
    this.setStatus('READY');
  }

  public terminate(signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): void {
    if (this.status === 'TERMINATED') {
      return;
    }
    this.setStatus('TERMINATING');
    this.releaseLock();
    this.emit('terminated', { instanceId: this.instanceId, signal, timestamp: new Date() });
    this.setStatus('TERMINATED');
  }
}
