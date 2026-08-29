/**
 * @file ControlPlaneError.ts
 * @description Typed error hierarchy for Synapse OS Control Plane operations.
 */

export interface ControlPlaneErrorContext {
  readonly code: string;
  readonly tenantId?: string;
  readonly agentId?: string;
  readonly sessionId?: string;
  readonly taskId?: string;
  readonly details?: Record<string, unknown>;
}

export class ControlPlaneError extends Error {
  public readonly code: string;
  public readonly tenantId?: string;
  public readonly agentId?: string;
  public readonly sessionId?: string;
  public readonly taskId?: string;
  public readonly details?: Readonly<Record<string, unknown>>;
  public readonly timestamp: Date;

  constructor(message: string, context: ControlPlaneErrorContext) {
    super(message);
    this.name = this.constructor.name;
    this.code = context.code;
    this.tenantId = context.tenantId;
    this.agentId = context.agentId;
    this.sessionId = context.sessionId;
    this.taskId = context.taskId;
    this.details = context.details ? Object.freeze({ ...context.details }) : undefined;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentLifecycleError extends ControlPlaneError {
  constructor(message: string, context: Omit<ControlPlaneErrorContext, 'code'> & { code?: string }) {
    super(message, { code: context.code ?? 'AGENT_LIFECYCLE_ERROR', ...context });
  }
}

export class TaskStateError extends ControlPlaneError {
  constructor(message: string, context: Omit<ControlPlaneErrorContext, 'code'> & { code?: string }) {
    super(message, { code: context.code ?? 'TASK_STATE_ERROR', ...context });
  }
}

export class SessionNotFoundError extends ControlPlaneError {
  constructor(sessionId: string, context?: Partial<ControlPlaneErrorContext>) {
    super(`Session '${sessionId}' was not found in control plane registry`, {
      code: 'SESSION_NOT_FOUND',
      sessionId,
      ...context,
    });
  }
}

export class DependencyCycleError extends ControlPlaneError {
  constructor(cyclePath: readonly string[], context?: Partial<ControlPlaneErrorContext>) {
    super(`Cyclic dependency detected in task DAG: ${cyclePath.join(' -> ')}`, {
      code: 'DEPENDENCY_CYCLE_DETECTED',
      details: { cyclePath },
      ...context,
    });
  }
}

export class QuotaExceededError extends ControlPlaneError {
  constructor(resource: string, limit: number, current: number, context?: Partial<ControlPlaneErrorContext>) {
    super(`Resource quota exceeded for '${resource}': current ${current} >= limit ${limit}`, {
      code: 'QUOTA_EXCEEDED',
      details: { resource, limit, current },
      ...context,
    });
  }
}

export class LockAcquisitionError extends ControlPlaneError {
  constructor(resource: string, holderId: string, context?: Partial<ControlPlaneErrorContext>) {
    super(`Failed to acquire lock for '${resource}'; currently held by '${holderId}'`, {
      code: 'LOCK_ACQUISITION_FAILED',
      details: { resource, holderId },
      ...context,
    });
  }
}

export class InvalidStateTransitionError extends ControlPlaneError {
  constructor(
    entityType: 'AGENT' | 'TASK' | 'SESSION' | 'TEAM' | 'WORKSPACE',
    fromState: string,
    toState: string,
    context?: Partial<ControlPlaneErrorContext>
  ) {
    super(`Invalid ${entityType} state transition: '${fromState}' -> '${toState}'`, {
      code: 'INVALID_STATE_TRANSITION',
      details: { entityType, fromState, toState },
      ...context,
    });
  }
}

export class BudgetExceededError extends ControlPlaneError {
  constructor(teamId: string, budgetType: string, context?: Partial<ControlPlaneErrorContext>) {
    super(`Team '${teamId}' exceeded its allocated ${budgetType} budget`, {
      code: 'TEAM_BUDGET_EXCEEDED',
      details: { teamId, budgetType },
      ...context,
    });
  }
}

export class WorkspaceProvisioningError extends ControlPlaneError {
  constructor(workspacePath: string, reason: string, context?: Partial<ControlPlaneErrorContext>) {
    super(`Failed to provision workspace at '${workspacePath}': ${reason}`, {
      code: 'WORKSPACE_PROVISIONING_FAILED',
      details: { workspacePath, reason },
      ...context,
    });
  }
}
