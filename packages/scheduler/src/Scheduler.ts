import {
  ScheduleDefinition,
  CreateScheduleInput,
  IScheduleRepository,
  InMemoryScheduleRepository,
} from './ScheduleRepository.js';
import { IScheduleLock, InMemoryScheduleLock } from './ScheduleLock.js';
import { SchedulePolicyEvaluator, ITenantPolicyProvider } from './SchedulePolicy.js';
import { ScheduleRunner, TaskExecutionHandler, RunResult } from './ScheduleRunner.js';
import { ScheduleRecoveryManager, RecoveryAction } from './ScheduleRecovery.js';

export interface SchedulerOptions {
  repository?: IScheduleRepository;
  lock?: IScheduleLock;
  policyProvider?: ITenantPolicyProvider;
  executionHandler?: TaskExecutionHandler;
  pollIntervalMs?: number;
}

export class Scheduler {
  private readonly repository: IScheduleRepository;
  private readonly lock: IScheduleLock;
  private readonly policy: SchedulePolicyEvaluator;
  private readonly runner: ScheduleRunner;
  private readonly recovery: ScheduleRecoveryManager;
  private readonly pollIntervalMs: number;

  private isRunning = false;
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(options: SchedulerOptions = {}) {
    this.repository = options.repository ?? new InMemoryScheduleRepository();
    this.lock = options.lock ?? new InMemoryScheduleLock();
    this.policy = new SchedulePolicyEvaluator(options.policyProvider);
    this.runner = new ScheduleRunner({
      repository: this.repository,
      lock: this.lock,
      policy: this.policy,
      handler: options.executionHandler,
    });
    this.recovery = new ScheduleRecoveryManager(this.repository);
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run recovery on start to catch up any missed tasks during server downtime
    await this.recoverMissed();

    this.scheduleNextTick();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    this.tickTimer = setTimeout(() => {
      void this.tick().finally(() => {
        this.scheduleNextTick();
      });
    }, this.pollIntervalMs);
  }

  /**
   * Main scheduler tick evaluating due schedules concurrently.
   */
  public async tick(now: Date = new Date()): Promise<RunResult[]> {
    const due = await this.repository.listDueSchedules(now);
    const settled = await Promise.allSettled(
      due.map((schedule) => this.runner.runSchedule(schedule, false))
    );

    const results: RunResult[] = [];
    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]!;
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        const schedule = due[i]!;
        results.push({
          scheduleId: schedule.id,
          triggered: false,
          status: 'FAILED',
          reason: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
          durationMs: 0,
        });
      }
    }

    return results;
  }

  public async createSchedule(input: CreateScheduleInput): Promise<ScheduleDefinition> {
    return this.repository.create(input);
  }

  public async getSchedule(id: string): Promise<ScheduleDefinition | null> {
    return this.repository.getById(id);
  }

  public async listByTenant(tenantId: string): Promise<ScheduleDefinition[]> {
    return this.repository.listByTenant(tenantId);
  }

  public async updateSchedule(
    id: string,
    updates: Partial<ScheduleDefinition>
  ): Promise<ScheduleDefinition | null> {
    return this.repository.update(id, updates);
  }

  public async deleteSchedule(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  public async triggerManually(id: string): Promise<RunResult> {
    const schedule = await this.repository.getById(id);
    if (!schedule) {
      return {
        scheduleId: id,
        triggered: false,
        status: 'FAILED',
        reason: `Schedule with ID ${id} not found.`,
      };
    }

    return this.runner.runSchedule(schedule, true);
  }

  public async recoverMissed(): Promise<RecoveryAction[]> {
    return this.recovery.recoverMissedSchedules(new Date(), async (schedule) => {
      await this.runner.runSchedule(schedule, false);
    });
  }

  public getRepository(): IScheduleRepository {
    return this.repository;
  }
}
