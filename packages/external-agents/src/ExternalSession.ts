import { randomUUID } from 'node:crypto';
import {
  IAgentAdapter,
  ExternalToolCallProposal,
  ExternalToolCallDecision,
  ExternalStepTelemetry,
} from './AgentAdapter.js';
import { ExternalAgent } from './ExternalAgent.js';

export type ExternalSessionStatus =
  | 'INITIALIZED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED';

export interface ExternalSessionOptions {
  sessionId?: string;
  tenantId: string;
  taskId?: string;
  externalAgent: ExternalAgent;
  adapter: IAgentAdapter;
  policyCheckCallback?: (
    tool: ExternalToolCallProposal
  ) => Promise<ExternalToolCallDecision>;
  auditCallback?: (event: string, details: Record<string, unknown>) => Promise<void>;
}

export class ExternalSession {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly taskId?: string;
  public readonly externalAgent: ExternalAgent;
  public externalSessionId?: string;
  public status: ExternalSessionStatus = 'INITIALIZED';

  private readonly adapter: IAgentAdapter;
  private readonly policyCallback?: (
    tool: ExternalToolCallProposal
  ) => Promise<ExternalToolCallDecision>;
  private readonly auditCallback?: (
    event: string,
    details: Record<string, unknown>
  ) => Promise<void>;

  public readonly telemetrySteps: ExternalStepTelemetry[] = [];
  public totalTokensUsed = 0;
  public readonly startedAt: string;
  public completedAt?: string;

  constructor(options: ExternalSessionOptions) {
    this.id = options.sessionId ?? randomUUID();
    this.tenantId = options.tenantId;
    this.taskId = options.taskId;
    this.externalAgent = options.externalAgent;
    this.adapter = options.adapter;
    this.policyCallback = options.policyCheckCallback;
    this.auditCallback = options.auditCallback;
    this.startedAt = new Date().toISOString();
  }

  public async start(systemPrompt: string, initialTask: string): Promise<void> {
    await this.adapter.initialize(this.externalAgent.endpoint, this.externalAgent.credentials);

    const sessionRes = await this.adapter.startSession(
      this.id,
      systemPrompt,
      initialTask
    );

    this.externalSessionId = sessionRes.externalSessionId;
    this.status = 'RUNNING';

    if (this.auditCallback) {
      await this.auditCallback('external_agent.session_started', {
        sessionId: this.id,
        externalSessionId: this.externalSessionId,
        agentId: this.externalAgent.id,
      });
    }
  }

  public async executeStep(
    userMessage: string
  ): Promise<{ response: string; executedTools: string[]; status: ExternalSessionStatus }> {
    if (this.status !== 'RUNNING' && this.status !== 'INITIALIZED') {
      throw new Error(`Cannot execute step in state ${this.status}`);
    }

    if (!this.externalSessionId) {
      throw new Error('Session not started');
    }

    const stepIndex = this.telemetrySteps.length + 1;
    const maxSteps = this.externalAgent.sandboxConstraints.maxStepsPerSession ?? 50;

    if (stepIndex > maxSteps) {
      this.status = 'FAILED';
      throw new Error(`Max steps limit reached (${maxSteps}).`);
    }

    const stepResult = await this.adapter.sendMessage(this.externalSessionId, userMessage);
    const executedTools: string[] = [];

    // Intercept and evaluate proposed tools through Synapse supervisory policy
    for (const proposal of stepResult.toolProposals) {
      // 1. Check sandbox constraints
      const constraints = this.externalAgent.sandboxConstraints;
      if (constraints.deniedTools && constraints.deniedTools.includes(proposal.toolName)) {
        throw new Error(`Tool "${proposal.toolName}" is prohibited by agent sandbox policy.`);
      }
      if (
        constraints.allowedTools &&
        constraints.allowedTools.length > 0 &&
        !constraints.allowedTools.includes(proposal.toolName)
      ) {
        throw new Error(`Tool "${proposal.toolName}" is not in the allowed tool list.`);
      }

      // 2. Proactive policy check
      if (this.policyCallback) {
        const decision = await this.policyCallback(proposal);
        if (!decision.allowed) {
          throw new Error(`Policy denied tool "${proposal.toolName}": ${decision.reason}`);
        }
        if (decision.requiresHumanApproval) {
          this.status = 'WAITING_APPROVAL';
          return {
            response: stepResult.responseText,
            executedTools,
            status: this.status,
          };
        }
      }

      executedTools.push(proposal.toolName);
    }

    const stepTelemetry: ExternalStepTelemetry = {
      stepIndex,
      thought: stepResult.responseText,
      toolCalls: stepResult.toolProposals,
      timestamp: new Date().toISOString(),
    };
    this.telemetrySteps.push(stepTelemetry);

    return {
      response: stepResult.responseText,
      executedTools,
      status: this.status,
    };
  }

  public async complete(): Promise<void> {
    this.status = 'COMPLETED';
    this.completedAt = new Date().toISOString();

    if (this.auditCallback) {
      await this.auditCallback('external_agent.session_completed', {
        sessionId: this.id,
        totalSteps: this.telemetrySteps.length,
      });
    }
  }

  public async abort(): Promise<void> {
    this.status = 'ABORTED';
    this.completedAt = new Date().toISOString();

    if (this.externalSessionId) {
      await this.adapter.abortSession(this.externalSessionId).catch(() => {});
    }

    if (this.auditCallback) {
      await this.auditCallback('external_agent.session_aborted', {
        sessionId: this.id,
      });
    }
  }
}
