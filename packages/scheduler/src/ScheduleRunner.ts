import {
  ScheduleDefinition,
  IScheduleRepository,
  CronCalculator,
} from './ScheduleRepository.js';
import { IScheduleLock } from './ScheduleLock.js';
import { SchedulePolicyEvaluator } from './SchedulePolicy.js';

export interface TaskExecutionHandler {
  (params: {
    tenantId: string;
    agentId: string;
    scheduleId: string;
    payload: Record<string, unknown>;
  }): Promise<{ taskId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>;
}

export interface RunResult {
  scheduleId: string;
  triggered: boolean;
  taskId?: string;
  status?: 'SUCCESS' | 'FAILED' | 'SKIPPED_LOCK' | 'SKIPPED_POLICY';
  reason?: string;
  durationMs?: number;
}

export class ScheduleRunner {
  private readonly repository: IScheduleRepository;
  private readonly lock: IScheduleLock;
  private readonly policy: SchedulePolicyEvaluator;
  private readonly handler?: TaskExecutionHandler;

  constructor(options: {
    repository: IScheduleRepository;
    lock: IScheduleLock;
    policy?: SchedulePolicyEvaluator;
    handler?: TaskExecutionHandler;
  }) {
    this.repository = options.repository;
    this.lock = options.lock;
    this.policy = options.policy ?? new SchedulePolicyEvaluator();
    this.handler = options.handler;
  }

  /**
   * Executes a scheduled task with distributed locking, policy evaluation, and error isolation.
   */
  public async runSchedule(schedule: ScheduleDefinition, _isManual = false): Promise<RunResult> {
    const startTime = Date.now();
    const lockKey = `schedule:lock:${schedule.id}`;

    // 1. Acquire distributed lease lock
    const lockRes = await this.lock.acquire(lockKey, 60000);
    if (!lockRes.acquired) {
      return {
        scheduleId: schedule.id,
        triggered: false,
        status: 'SKIPPED_LOCK',
        reason: lockRes.reason ?? 'Concurrent execution locked by another worker.',
      };
    }

    try {
      // 2. Evaluate tenant safety & budget policies
      const policyRes = await this.policy.evaluate(schedule);
      if (!policyRes.allowed) {
        return {
          scheduleId: schedule.id,
          triggered: false,
          status: 'SKIPPED_POLICY',
          reason: policyRes.reason,
        };
      }

      // 3. Compute and advance next run timestamp
      const now = new Date();
      const nextRun = CronCalculator.calculateNextRun(
        schedule.cronExpression,
        now,
        schedule.timezone
      ).toISOString();

      await this.repository.update(schedule.id, {
        lastRunAt: now.toISOString(),
        nextRunAt: nextRun,
      });

      // 4. Dispatch task to execution engine
      let executionResult: { taskId: string; status: 'SUCCESS' | 'FAILED'; error?: string } = {
        taskId: `task_sched_${Date.now()}`,
        status: 'SUCCESS',
      };

      if (this.handler) {
        executionResult = await this.handler({
          tenantId: schedule.tenantId,
          agentId: schedule.agentId,
          scheduleId: schedule.id,
          payload: schedule.taskPayload,
        });
      }

      await this.repository.update(schedule.id, {
        lastStatus: executionResult.status,
      });

      return {
        scheduleId: schedule.id,
        triggered: true,
        taskId: executionResult.taskId,
        status: executionResult.status,
        reason: executionResult.error,
        durationMs: Date.now() - startTime,
      };
    } finally {
      if (lockRes.token) {
        await this.lock.release(lockKey, lockRes.token);
      }
    }
  }
}
