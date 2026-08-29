/**
 * @file SimulationClock.ts
 * @description Discrete-event virtual clock supporting step-by-step ticks, priority event queues, fast-forward, pause/resume, and scheduled callbacks.
 */
export interface ScheduledTask<T = unknown> {
    readonly id: string;
    readonly scheduledTime: number;
    readonly priority: number;
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
export declare class SimulationClock {
    private _currentTime;
    private readonly _startVirtualTime;
    private _timeScale;
    private _tickCount;
    private _isRunning;
    private readonly _taskQueue;
    constructor(startVirtualTime?: number, timeScale?: number);
    get currentTime(): number;
    get startVirtualTime(): number;
    get timeScale(): number;
    get tickCount(): number;
    get isRunning(): boolean;
    get queuedTaskCount(): number;
    setTimeScale(scale: number): void;
    start(): void;
    pause(): void;
    reset(newStartTime?: number): void;
    /**
     * Schedules a task to execute at a specific future virtual timestamp.
     */
    schedule<T = unknown>(scheduledTime: number, execute: (currentTime: number, payload: T) => Promise<void> | void, payload?: T, priority?: number): string;
    /**
     * Advances the simulation clock by stepDeltaMs and executes all scheduled tasks due in that interval.
     */
    tick(stepDeltaMs: number): Promise<number>;
    /**
     * Fast-forwards the clock directly to the target timestamp, executing scheduled tasks in precise order.
     */
    advanceTo(targetTime: number): Promise<number>;
    /**
     * Advances clock to next available scheduled task.
     */
    advanceToNextTask(): Promise<boolean>;
    cancel(taskId: string): boolean;
    getSnapshot(): ClockSnapshot;
}
//# sourceMappingURL=SimulationClock.d.ts.map