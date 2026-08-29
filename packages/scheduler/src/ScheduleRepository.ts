import { randomUUID } from 'node:crypto';

export type MisfirePolicy = 'FIRE_NOW' | 'IGNORE_MISFIRES' | 'RESCHEDULE_NEXT';

export interface ScheduleDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string; // e.g. 'UTC', 'America/New_York'
  agentId: string;
  taskPayload: Record<string, unknown>;
  enabled: boolean;
  concurrencyLimit: number;
  misfirePolicy: MisfirePolicy;
  maxRetries: number;
  timeoutSeconds: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus?: 'SUCCESS' | 'FAILED' | 'MISFIRED' | 'SKIPPED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  tenantId: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone?: string;
  agentId: string;
  taskPayload: Record<string, unknown>;
  enabled?: boolean;
  concurrencyLimit?: number;
  misfirePolicy?: MisfirePolicy;
  maxRetries?: number;
  timeoutSeconds?: number;
}

export class CronCalculator {
  /**
   * Calculates the next execution timestamp from a given date using a 5-part cron expression.
   * Format: [minute] [hour] [dayOfMonth] [month] [dayOfWeek]
   */
  public static calculateNextRun(
    cronExpression: string,
    fromDate: Date = new Date(),
    _timezone = 'UTC'
  ): Date {
    const expr = this.normalizeExpression(cronExpression);
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: "${cronExpression}". Expected 5 fields.`);
    }

    // Search forward minute by minute up to 1 year
    const next = new Date(fromDate.getTime() + 60000);
    next.setSeconds(0, 0);

    const maxSearchMinutes = 60 * 24 * 366; // 1 year
    for (let i = 0; i < maxSearchMinutes; i++) {
      if (this.matches(parts, next)) {
        return next;
      }
      next.setMinutes(next.getMinutes() + 1);
    }

    throw new Error(`Could not find next execution within 1 year for: "${cronExpression}"`);
  }

  private static normalizeExpression(expr: string): string {
    const trimmed = expr.trim().toLowerCase();
    switch (trimmed) {
      case '@yearly':
      case '@annually':
        return '0 0 1 1 *';
      case '@monthly':
        return '0 0 1 * *';
      case '@weekly':
        return '0 0 * * 0';
      case '@daily':
      case '@midnight':
        return '0 0 * * *';
      case '@hourly':
        return '0 * * * *';
      default:
        return trimmed;
    }
  }

  private static matches(parts: string[], date: Date): boolean {
    const [minExpr, hourExpr, dayExpr, monthExpr, dowExpr] = parts;

    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // 1-12
    const dow = date.getDay(); // 0-6 (Sun-Sat)

    return (
      this.fieldMatches(minExpr, minute, 0, 59) &&
      this.fieldMatches(hourExpr, hour, 0, 23) &&
      this.fieldMatches(dayExpr, day, 1, 31) &&
      this.fieldMatches(monthExpr, month, 1, 12) &&
      this.fieldMatches(dowExpr, dow, 0, 6)
    );
  }

  private static fieldMatches(expr: string, value: number, min: number, max: number): boolean {
    if (expr === '*') return true;

    // Handles lists: "1,2,5"
    if (expr.includes(',')) {
      return expr.split(',').some((sub) => this.fieldMatches(sub, value, min, max));
    }

    // Handles steps: "*/5" or "10-30/5"
    if (expr.includes('/')) {
      const [rangeStr, stepStr] = expr.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) return false;

      let start = min;
      let end = max;
      if (rangeStr !== '*') {
        if (rangeStr.includes('-')) {
          const [s, e] = rangeStr.split('-').map(Number);
          start = s;
          end = e;
        } else {
          start = parseInt(rangeStr, 10);
        }
      }

      if (value < start || value > end) return false;
      return (value - start) % step === 0;
    }

    // Handles ranges: "1-5"
    if (expr.includes('-')) {
      const [start, end] = expr.split('-').map(Number);
      return value >= start && value <= end;
    }

    // Exact value
    const exact = parseInt(expr, 10);
    return exact === value;
  }
}

export interface IScheduleRepository {
  create(input: CreateScheduleInput): Promise<ScheduleDefinition>;
  getById(id: string): Promise<ScheduleDefinition | null>;
  listByTenant(tenantId: string): Promise<ScheduleDefinition[]>;
  listDueSchedules(now?: Date): Promise<ScheduleDefinition[]>;
  update(id: string, updates: Partial<ScheduleDefinition>): Promise<ScheduleDefinition | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryScheduleRepository implements IScheduleRepository {
  private schedules = new Map<string, ScheduleDefinition>();

  public async create(input: CreateScheduleInput): Promise<ScheduleDefinition> {
    const id = randomUUID();
    const now = new Date();
    const timezone = input.timezone ?? 'UTC';
    const nextRun = input.enabled !== false
      ? CronCalculator.calculateNextRun(input.cronExpression, now, timezone).toISOString()
      : null;

    const schedule: ScheduleDefinition = {
      id,
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      cronExpression: input.cronExpression,
      timezone,
      agentId: input.agentId,
      taskPayload: input.taskPayload,
      enabled: input.enabled ?? true,
      concurrencyLimit: input.concurrencyLimit ?? 1,
      misfirePolicy: input.misfirePolicy ?? 'RESCHEDULE_NEXT',
      maxRetries: input.maxRetries ?? 3,
      timeoutSeconds: input.timeoutSeconds ?? 3600,
      nextRunAt: nextRun,
      lastRunAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.schedules.set(id, schedule);
    return schedule;
  }

  public async getById(id: string): Promise<ScheduleDefinition | null> {
    return this.schedules.get(id) ?? null;
  }

  public async listByTenant(tenantId: string): Promise<ScheduleDefinition[]> {
    return Array.from(this.schedules.values()).filter((s) => s.tenantId === tenantId);
  }

  public async listDueSchedules(now: Date = new Date()): Promise<ScheduleDefinition[]> {
    const nowIso = now.toISOString();
    return Array.from(this.schedules.values()).filter(
      (s) => s.enabled && s.nextRunAt !== null && s.nextRunAt <= nowIso
    );
  }

  public async update(
    id: string,
    updates: Partial<ScheduleDefinition>
  ): Promise<ScheduleDefinition | null> {
    const existing = this.schedules.get(id);
    if (!existing) return null;

    const updated: ScheduleDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.cronExpression || updates.timezone || updates.enabled !== undefined) {
      if (updated.enabled) {
        updated.nextRunAt = CronCalculator.calculateNextRun(
          updated.cronExpression,
          new Date(),
          updated.timezone
        ).toISOString();
      } else {
        updated.nextRunAt = null;
      }
    }

    this.schedules.set(id, updated);
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }
}
