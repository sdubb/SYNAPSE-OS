import { ScheduleDefinition } from './ScheduleRepository.js';

export interface TenantBudgetStatus {
  tenantId: string;
  isSuspended: boolean;
  currentSpendUSD: number;
  maxBudgetUSD: number;
  activeRunningTasks: number;
  maxConcurrentTasks: number;
  inMaintenanceWindow?: boolean;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  deferUntil?: string;
}

export interface ITenantPolicyProvider {
  getTenantBudgetStatus(tenantId: string): Promise<TenantBudgetStatus>;
}

export class SchedulePolicyEvaluator {
  private readonly provider?: ITenantPolicyProvider;

  constructor(provider?: ITenantPolicyProvider) {
    this.provider = provider;
  }

  /**
   * Evaluates if a schedule is permitted to execute according to tenant governance rules.
   */
  public async evaluate(schedule: ScheduleDefinition): Promise<PolicyEvaluationResult> {
    if (!this.provider) {
      return { allowed: true };
    }

    const status = await this.provider.getTenantBudgetStatus(schedule.tenantId);

    if (status.isSuspended) {
      return {
        allowed: false,
        reason: `Tenant ${schedule.tenantId} is currently suspended. Execution blocked.`,
      };
    }

    if (status.inMaintenanceWindow) {
      return {
        allowed: false,
        reason: `Tenant ${schedule.tenantId} is currently in a scheduled maintenance window.`,
      };
    }

    if (status.maxBudgetUSD > 0 && status.currentSpendUSD >= status.maxBudgetUSD) {
      return {
        allowed: false,
        reason: `Tenant ${schedule.tenantId} has exceeded its monthly budget quota ($${status.currentSpendUSD}/$${status.maxBudgetUSD}).`,
      };
    }

    if (
      status.maxConcurrentTasks > 0 &&
      status.activeRunningTasks >= status.maxConcurrentTasks
    ) {
      return {
        allowed: false,
        reason: `Tenant ${schedule.tenantId} active task concurrency limit reached (${status.activeRunningTasks}/${status.maxConcurrentTasks}).`,
      };
    }

    return { allowed: true };
  }
}
