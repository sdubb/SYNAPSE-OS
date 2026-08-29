import {
  ScheduleDefinition,
  IScheduleRepository,
  CronCalculator,
} from './ScheduleRepository.js';

export interface RecoveryAction {
  scheduleId: string;
  policyApplied: string;
  action: 'FIRED' | 'SKIPPED' | 'RESCHEDULED';
  missedTimestamp: string;
  newNextRunAt: string | null;
}

export class ScheduleRecoveryManager {
  private readonly repository: IScheduleRepository;

  constructor(repository: IScheduleRepository) {
    this.repository = repository;
  }

  /**
   * Scans for past-due schedules that were missed during downtime and applies recovery policies.
   */
  public async recoverMissedSchedules(
    now: Date = new Date(),
    fireCallback?: (schedule: ScheduleDefinition) => Promise<void>
  ): Promise<RecoveryAction[]> {
    const dueSchedules = await this.repository.listDueSchedules(now);
    const actions: RecoveryAction[] = [];

    for (const schedule of dueSchedules) {
      const missedTimestamp = schedule.nextRunAt ?? now.toISOString();
      const nextFuture = CronCalculator.calculateNextRun(
        schedule.cronExpression,
        now,
        schedule.timezone
      ).toISOString();

      let action: 'FIRED' | 'SKIPPED' | 'RESCHEDULED' = 'RESCHEDULED';

      switch (schedule.misfirePolicy) {
        case 'FIRE_NOW':
          if (fireCallback) {
            try {
              await fireCallback(schedule);
              action = 'FIRED';
            } catch {
              action = 'SKIPPED';
            }
          }
          break;
        case 'IGNORE_MISFIRES':
          action = 'SKIPPED';
          break;
        case 'RESCHEDULE_NEXT':
        default:
          action = 'RESCHEDULED';
          break;
      }

      await this.repository.update(schedule.id, {
        nextRunAt: nextFuture,
        lastStatus: action === 'FIRED' ? 'SUCCESS' : 'MISFIRED',
      });

      actions.push({
        scheduleId: schedule.id,
        policyApplied: schedule.misfirePolicy,
        action,
        missedTimestamp,
        newNextRunAt: nextFuture,
      });
    }

    return actions;
  }
}
