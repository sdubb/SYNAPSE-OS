export interface AgentStepTelemetry {
  stepNumber: number;
  agentId: string;
  taskId: string;
  sessionId: string;
  tenantId: string;
  thoughtLength: number;
  toolsProposed: string[];
  toolsExecuted: string[];
  toolsFailed: string[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  timestamp: string;
}

export interface AgentExecutionSummary {
  agentId: string;
  taskId: string;
  sessionId: string;
  tenantId: string;
  totalSteps: number;
  totalDurationMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  toolCallCounts: Record<string, number>;
  toolFailureCounts: Record<string, number>;
  status: 'COMPLETED' | 'FAILED' | 'ABORTED';
  startedAt: string;
  completedAt: string;
}

export class AgentTelemetryCollector {
  private stepsBySession = new Map<string, AgentStepTelemetry[]>();

  public recordStep(step: AgentStepTelemetry): void {
    const existing = this.stepsBySession.get(step.sessionId) ?? [];
    existing.push(step);
    this.stepsBySession.set(step.sessionId, existing);
  }

  public getSessionSteps(sessionId: string): AgentStepTelemetry[] {
    return this.stepsBySession.get(sessionId) ?? [];
  }

  public summarizeSession(
    sessionId: string,
    status: 'COMPLETED' | 'FAILED' | 'ABORTED' = 'COMPLETED'
  ): AgentExecutionSummary | null {
    const steps = this.stepsBySession.get(sessionId);
    if (!steps || steps.length === 0) return null;

    const first = steps[0];
    const last = steps[steps.length - 1];

    let totalDurationMs = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const toolCallCounts: Record<string, number> = {};
    const toolFailureCounts: Record<string, number> = {};

    for (const step of steps) {
      totalDurationMs += step.durationMs;
      totalPromptTokens += step.promptTokens;
      totalCompletionTokens += step.completionTokens;

      for (const tool of step.toolsExecuted) {
        toolCallCounts[tool] = (toolCallCounts[tool] ?? 0) + 1;
      }
      for (const fail of step.toolsFailed) {
        toolFailureCounts[fail] = (toolFailureCounts[fail] ?? 0) + 1;
      }
    }

    return {
      agentId: first.agentId,
      taskId: first.taskId,
      sessionId: first.sessionId,
      tenantId: first.tenantId,
      totalSteps: steps.length,
      totalDurationMs,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      toolCallCounts,
      toolFailureCounts,
      status,
      startedAt: first.timestamp,
      completedAt: last.timestamp,
    };
  }

  public clearSession(sessionId: string): void {
    this.stepsBySession.delete(sessionId);
  }
}

export const agentTelemetry = new AgentTelemetryCollector();
