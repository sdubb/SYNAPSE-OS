/**
 * @file SimulationClock.ts
 * @description Discrete-event virtual clock supporting step-by-step ticks, priority event queues, fast-forward, pause/resume, and scheduled callbacks.
 */
export class SimulationClock {
    _currentTime;
    _startVirtualTime;
    _timeScale; // 1.0 = normal, 10.0 = 10x fast forward
    _tickCount;
    _isRunning;
    _taskQueue = [];
    constructor(startVirtualTime = 0, timeScale = 1.0) {
        this._currentTime = startVirtualTime;
        this._startVirtualTime = startVirtualTime;
        this._timeScale = timeScale;
        this._tickCount = 0;
        this._isRunning = false;
    }
    get currentTime() {
        return this._currentTime;
    }
    get startVirtualTime() {
        return this._startVirtualTime;
    }
    get timeScale() {
        return this._timeScale;
    }
    get tickCount() {
        return this._tickCount;
    }
    get isRunning() {
        return this._isRunning;
    }
    get queuedTaskCount() {
        return this._taskQueue.length;
    }
    setTimeScale(scale) {
        if (scale <= 0)
            throw new Error('Time scale must be greater than 0');
        this._timeScale = scale;
    }
    start() {
        this._isRunning = true;
    }
    pause() {
        this._isRunning = false;
    }
    reset(newStartTime) {
        this._currentTime = newStartTime ?? this._startVirtualTime;
        this._tickCount = 0;
        this._isRunning = false;
        this._taskQueue.length = 0;
    }
    /**
     * Schedules a task to execute at a specific future virtual timestamp.
     */
    schedule(scheduledTime, execute, payload, priority = 0) {
        const id = `task_${scheduledTime}_${Math.random().toString(36).substring(2, 7)}`;
        const task = {
            id,
            scheduledTime,
            priority,
            payload: payload,
            execute: execute,
        };
        // Insert sorted by scheduledTime asc, then priority desc
        let insertIndex = this._taskQueue.findIndex((t) => t.scheduledTime > scheduledTime || (t.scheduledTime === scheduledTime && t.priority < priority));
        if (insertIndex === -1) {
            this._taskQueue.push(task);
        }
        else {
            this._taskQueue.splice(insertIndex, 0, task);
        }
        return id;
    }
    /**
     * Advances the simulation clock by stepDeltaMs and executes all scheduled tasks due in that interval.
     */
    async tick(stepDeltaMs) {
        const targetTime = this._currentTime + stepDeltaMs;
        return this.advanceTo(targetTime);
    }
    /**
     * Fast-forwards the clock directly to the target timestamp, executing scheduled tasks in precise order.
     */
    async advanceTo(targetTime) {
        if (targetTime < this._currentTime) {
            throw new Error(`Cannot advance clock backwards: current=${this._currentTime}, target=${targetTime}`);
        }
        let tasksExecuted = 0;
        while (this._taskQueue.length > 0 && this._taskQueue[0].scheduledTime <= targetTime) {
            const nextTask = this._taskQueue.shift();
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
    async advanceToNextTask() {
        if (this._taskQueue.length === 0)
            return false;
        const nextTask = this._taskQueue.shift();
        this._currentTime = nextTask.scheduledTime;
        await nextTask.execute(this._currentTime, nextTask.payload);
        this._tickCount++;
        return true;
    }
    cancel(taskId) {
        const idx = this._taskQueue.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
            this._taskQueue.splice(idx, 1);
            return true;
        }
        return false;
    }
    getSnapshot() {
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
//# sourceMappingURL=SimulationClock.js.map