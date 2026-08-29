/**
 * @file SimulationClock.ts
 * @description Discrete-event virtual clock supporting step-by-step ticks, priority event queues, fast-forward, pause/resume, and scheduled callbacks.
 */

export interface ScheduledTask<T = unknown> {
  readonly id: string;
  readonly scheduledTime: number;
  readonly priority: number; // Higher number = higher priority
  readonly payload: T;
  readonly execute: (currentTime: number, payload: T) => Promise<void> | void;
}

export interface ClockSnapshot {
  readonly currentTime: number;
  readonly startVirtualTime: number;
  readonly timeScale: number;
  readonly tickCount: number;
  readonly isRunning: boolean;
  readonly queuedTasksCount: number;
}

export class SimulationClock {
  private _currentTime: number;
  private readonly _startVirtualTime: number;
  private _timeScale: number; // 1.0 = normal, 10.0 = 10x fast forward
  private _tickCount: number;
  private _isRunning: boolean;
  private readonly _taskQueue: ScheduledTask<unknown>[] = [];

  constructor(startVirtualTime = 0, timeScale = 1.0) {
    this._currentTime = startVirtualTime;
    this._startVirtualTime = startVirtualTime;
    this._timeScale = timeScale;
    this._tickCount = 0;
    this._isRunning = false;
  }

  public get currentTime(): number {
    return this._currentTime;
  }

  public get startVirtualTime(): number {
    return this._startVirtualTime;
  }

  public get timeScale(): number {
    return this._timeScale;
  }

  public get tickCount(): number {
    return this._tickCount;
  }

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public get queuedTaskCount(): number {
    return this._taskQueue.length;
  }

  public setTimeScale(scale: number): void {
    if (scale <= 0) throw new Error('Time scale must be greater than 0');
    this._timeScale = scale;
  }

  public start(): void {
    this._isRunning = true;
  }

  public pause(): void {
    this._isRunning = false;
  }

  public reset(newStartTime?: number): void {
    this._currentTime = newStartTime ?? this._startVirtualTime;
    this._tickCount = 0;
    this._isRunning = false;
    this._taskQueue.length = 0;
  }

  /**
   * Schedules a task to execute at a specific future virtual timestamp.
   */
  public schedule<T = unknown>(
    scheduledTime: number,
    execute: (currentTime: number, payload: T) => Promise<void> | void,
    payload?: T,
    priority = 0
  ): string {
    const id = `task_${scheduledTime}_${Math.random().toString(36).substring(2, 7)}`;
    const task: ScheduledTask<unknown> = {
      id,
      scheduledTime,
      priority,
      payload: payload as unknown,
      execute: execute as (currTime: number, p: unknown) => Promise<void> | void,
    };

    // Insert sorted by scheduledTime asc, then priority desc
    let insertIndex = this._taskQueue.findIndex(
      (t) => t.scheduledTime > scheduledTime || (t.scheduledTime === scheduledTime && t.priority < priority)
    );

    if (insertIndex === -1) {
      this._taskQueue.push(task);
    } else {
      this._taskQueue.splice(insertIndex, 0, task);
    }

    return id;
  }

  /**
   * Advances the simulation clock by stepDeltaMs and executes all scheduled tasks due in that interval.
   */
  public async tick(stepDeltaMs: number): Promise<number> {
    const targetTime = this._currentTime + stepDeltaMs;
    return this.advanceTo(targetTime);
  }

  /**
   * Fast-forwards the clock directly to the target timestamp, executing scheduled tasks in precise order.
   */
  public async advanceTo(targetTime: number): Promise<number> {
    if (targetTime < this._currentTime) {
      throw new Error(`Cannot advance clock backwards: current=${this._currentTime}, target=${targetTime}`);
    }

    let tasksExecuted = 0;

    while (this._taskQueue.length > 0 && this._taskQueue[0]!.scheduledTime <= targetTime) {
      const nextTask = this._taskQueue.shift()!;
      this._currentTime = nextTask.scheduledTime;
      await nextTask.execute(this._currentTime, nextTask.payload);
      tasksExecuted++;
    }

    this._currentTime = targetTime;
    this._tickCount++;
    return tasksExecuted;
  }

  /**
   * Advances clock to next available scheduled task.
   */
  public async advanceToNextTask(): Promise<boolean> {
    if (this._taskQueue.length === 0) return false;
    const nextTask = this._taskQueue.shift()!;
    this._currentTime = nextTask.scheduledTime;
    await nextTask.execute(this._currentTime, nextTask.payload);
    this._tickCount++;
    return true;
  }

  public cancel(taskId: string): boolean {
    const idx = this._taskQueue.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this._taskQueue.splice(idx, 1);
      return true;
    }
    return false;
  }

  public getSnapshot(): ClockSnapshot {
    return {
      currentTime: this._currentTime,
      startVirtualTime: this._startVirtualTime,
      timeScale: this._timeScale,
      tickCount: this._tickCount,
      isRunning: this._isRunning,
      queuedTasksCount: this._taskQueue.length,
    };
  }
}
