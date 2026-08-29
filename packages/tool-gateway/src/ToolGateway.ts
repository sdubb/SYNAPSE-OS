import crypto from "node:crypto";
import { PolicyEngine } from "@synapse/policy-engine";
import { SafetyEngine } from "@synapse/safety-engine";
import { ApprovalEngine } from "@synapse/approval-engine";
import { CapabilityRegistry, globalCapabilityRegistry } from "@synapse/capabilities";
import { EvidenceStore } from "@synapse/evidence";
import { AuditEngine } from "@synapse/audit-engine";
import { EventBus } from "@synapse/event-bus";
import { SecretRedactor } from "@synapse/secrets";
import { CapabilityAuthorizer } from "./CapabilityAuthorizer.js";
import { SafetyPolicyPipeline } from "./SafetyPolicyPipeline.js";
import type {
  ToolInvocationContext,
  ToolAuthorizationResult,
  ToolExecutionResult,
} from "./types.js";

export interface ToolGatewayOptions {
  policyEngine?: PolicyEngine;
  safetyEngine?: SafetyEngine;
  approvalEngine?: ApprovalEngine;
  capabilityRegistry?: CapabilityRegistry;
  evidenceStore?: EvidenceStore;
  auditEngine?: AuditEngine;
  eventBus?: EventBus;
  secretRedactor?: SecretRedactor;
}

export class ToolGateway {
  public readonly policyEngine: PolicyEngine;
  public readonly safetyEngine: SafetyEngine;
  public readonly approvalEngine: ApprovalEngine;
  public readonly capabilityRegistry: CapabilityRegistry;
  public readonly evidenceStore: EvidenceStore;
  public readonly auditEngine: AuditEngine;
  public readonly eventBus: EventBus;
  public readonly secretRedactor: SecretRedactor;

  private readonly pipeline: SafetyPolicyPipeline;

  constructor(options?: ToolGatewayOptions) {
    this.policyEngine = options?.policyEngine ?? new PolicyEngine();
    this.safetyEngine = options?.safetyEngine ?? new SafetyEngine();
    this.approvalEngine = options?.approvalEngine ?? new ApprovalEngine();
    this.capabilityRegistry = options?.capabilityRegistry ?? globalCapabilityRegistry;
    this.evidenceStore = options?.evidenceStore ?? new EvidenceStore();
    this.auditEngine = options?.auditEngine ?? new AuditEngine();
    this.eventBus = options?.eventBus ?? new EventBus();
    this.secretRedactor = options?.secretRedactor ?? new SecretRedactor();

    const capabilityAuthorizer = new CapabilityAuthorizer(this.capabilityRegistry);
    this.pipeline = new SafetyPolicyPipeline(
      this.policyEngine,
      this.safetyEngine,
      capabilityAuthorizer
    );
  }

  /**
   * Evaluates and authoritatively authorizes a proposed tool execution.
   * If approval is required, pauses and awaits operator decision or default timeout.
   */
  public async evaluateAndAuthorizeToolCall(
    context: ToolInvocationContext
  ): Promise<ToolAuthorizationResult> {
    const timestamp = Date.now();
    const callId = context.callId || crypto.randomUUID();

    // 1. Emit tool requested event
    this.eventBus.publish({
      eventType: "tool.requested",
      tenantId: context.tenantId,
      agentId: context.agentId,
      missionId: context.missionId,
      taskId: context.taskId,
      runId: context.runId,
      attemptId: context.attemptId,
      sessionId: context.sessionId,
      workspaceId: context.workspaceId,
      runtimeId: context.runtimeId,
      source: "tool.gateway",
      payload: {
        toolName: context.toolName,
        callId,
        arguments: this.secretRedactor.redactObject(context.toolArguments),
      },
    });

    // 2. Evaluate through Safety & Policy Pipeline
    const pipelineResult = this.pipeline.evaluate(context);

    // 3. Handle BLOCKED decision
    if (pipelineResult.decision === "BLOCK") {
      this.eventBus.publish({
        eventType: "tool.blocked",
        tenantId: context.tenantId,
        agentId: context.agentId,
        missionId: context.missionId,
        taskId: context.taskId,
        runId: context.runId,
        attemptId: context.attemptId,
        sessionId: context.sessionId,
        workspaceId: context.workspaceId,
        runtimeId: context.runtimeId,
        source: "tool.gateway",
        payload: {
          toolName: context.toolName,
          callId,
          reason: pipelineResult.reason,
          remediation: pipelineResult.remediation,
          riskLevel: pipelineResult.riskLevel,
        },
      });

      await this.auditEngine.logSecurityEvent({
        tenantId: context.tenantId,
        actor: { id: context.agentId, type: "AGENT", tenantId: context.tenantId },
        eventType: "tool.blocked",
        severity: pipelineResult.riskLevel === "CRITICAL" ? "CRITICAL" : "WARNING",
        targetId: context.toolName,
        targetType: "TOOL",
        details: {
          toolName: context.toolName,
          arguments: this.secretRedactor.redactObject(context.toolArguments),
          reason: pipelineResult.reason,
          remediation: pipelineResult.remediation,
          riskLevel: pipelineResult.riskLevel,
        },
      });

      return {
        authorized: false,
        decision: "BLOCK",
        reason: pipelineResult.reason,
        remediation: pipelineResult.remediation,
        riskLevel: pipelineResult.riskLevel,
        timestamp,
      };
    }

    // 4. Handle REQUIRE_APPROVAL decision
    if (pipelineResult.decision === "REQUIRE_APPROVAL") {
      this.eventBus.publish({
        eventType: "tool.approval_required",
        tenantId: context.tenantId,
        agentId: context.agentId,
        missionId: context.missionId,
        taskId: context.taskId,
        runId: context.runId,
        attemptId: context.attemptId,
        sessionId: context.sessionId,
        workspaceId: context.workspaceId,
        runtimeId: context.runtimeId,
        source: "tool.gateway",
        payload: {
          toolName: context.toolName,
          callId,
          riskLevel: pipelineResult.riskLevel,
          reason: pipelineResult.reason,
          arguments: this.secretRedactor.redactObject(context.toolArguments),
        },
      });

      const approvalResolution = await this.approvalEngine.requestApproval({
        tenantId: context.tenantId,
        userId: context.userId,
        sessionId: context.sessionId,
        agentId: context.agentId,
        missionId: context.missionId,
        taskId: context.taskId,
        runId: context.runId,
        attemptId: context.attemptId,
        workspaceId: context.workspaceId,
        runtimeId: context.runtimeId,
        clineSessionId: context.clineSessionId || context.sessionId,
        callId,
        toolName: context.toolName,
        toolParameters: context.toolArguments,
        riskLevel: pipelineResult.riskLevel,
        reason: pipelineResult.reason,
        timeoutSeconds: 300,
      });

      const isApproved =
        approvalResolution.status === "approved" ||
        approvalResolution.status === "APPROVED" ||
        approvalResolution.status === "auto_approved" ||
        approvalResolution.status === "AUTO_APPROVED";

      if (isApproved) {
        this.eventBus.publish({
          eventType: "tool.approved",
          tenantId: context.tenantId,
          agentId: context.agentId,
          missionId: context.missionId,
          taskId: context.taskId,
          runId: context.runId,
          attemptId: context.attemptId,
          sessionId: context.sessionId,
          workspaceId: context.workspaceId,
          runtimeId: context.runtimeId,
          source: "tool.gateway",
          payload: {
            toolName: context.toolName,
            callId,
            approvalId: approvalResolution.requestId,
            approvedParameters: approvalResolution.approvedParameters,
          },
        });

        this.eventBus.publish({
          eventType: "tool.authorized",
          tenantId: context.tenantId,
          agentId: context.agentId,
          missionId: context.missionId,
          taskId: context.taskId,
          runId: context.runId,
          attemptId: context.attemptId,
          sessionId: context.sessionId,
          workspaceId: context.workspaceId,
          runtimeId: context.runtimeId,
          source: "tool.gateway",
          payload: { toolName: context.toolName, callId, authorized: true },
        });

        return {
          authorized: true,
          decision: "ALLOW",
          reason: "Approved by Operator",
          riskLevel: pipelineResult.riskLevel,
          modifiedParameters: (approvalResolution.approvedParameters as Record<string, unknown>) || undefined,
          approvalRequestId: approvalResolution.requestId,
          timestamp,
        };
      }

      // Rejection or timeout
      const denyReason =
        approvalResolution.reason ||
        approvalResolution.decision?.reason ||
        (approvalResolution.status === "timed_out" || approvalResolution.status === "TIMED_OUT"
          ? "Approval timed out (Default-Deny)"
          : "Rejected by Operator");

      this.eventBus.publish({
        eventType: "tool.denied",
        tenantId: context.tenantId,
        agentId: context.agentId,
        missionId: context.missionId,
        taskId: context.taskId,
        runId: context.runId,
        attemptId: context.attemptId,
        sessionId: context.sessionId,
        workspaceId: context.workspaceId,
        runtimeId: context.runtimeId,
        source: "tool.gateway",
        payload: {
          toolName: context.toolName,
          callId,
          approvalId: approvalResolution.requestId,
          reason: denyReason,
        },
      });

      return {
        authorized: false,
        decision: "DENIED",
        reason: denyReason,
        riskLevel: pipelineResult.riskLevel,
        approvalRequestId: approvalResolution.requestId,
        timestamp,
      };
    }

    // 5. Handle ALLOW decision
    this.eventBus.publish({
      eventType: "tool.authorized",
      tenantId: context.tenantId,
      agentId: context.agentId,
      missionId: context.missionId,
      taskId: context.taskId,
      runId: context.runId,
      attemptId: context.attemptId,
      sessionId: context.sessionId,
      workspaceId: context.workspaceId,
      runtimeId: context.runtimeId,
      source: "tool.gateway",
      payload: {
        toolName: context.toolName,
        callId,
        authorized: true,
        reason: pipelineResult.reason,
      },
    });

    return {
      authorized: true,
      decision: "ALLOW",
      reason: pipelineResult.reason,
      riskLevel: pipelineResult.riskLevel,
      timestamp,
    };
  }

  /**
   * Executes a tool under authoritative governance, capturing evidence, audit records, and events.
   */
  public async executeTool(
    context: ToolInvocationContext,
    executor?: (ctx: ToolInvocationContext) => Promise<unknown>
  ): Promise<ToolExecutionResult> {
    const authResult = await this.evaluateAndAuthorizeToolCall(context);

    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.reason,
        durationMs: 0,
      };
    }

    const start = Date.now();
    const effectiveContext: ToolInvocationContext = authResult.modifiedParameters
      ? { ...context, toolArguments: authResult.modifiedParameters }
      : context;

    this.eventBus.publish({
      eventType: "tool.started",
      tenantId: context.tenantId,
      agentId: context.agentId,
      missionId: context.missionId,
      taskId: context.taskId,
      runId: context.runId,
      attemptId: context.attemptId,
      sessionId: context.sessionId,
      workspaceId: context.workspaceId,
      runtimeId: context.runtimeId,
      source: "tool.gateway",
      payload: {
        toolName: context.toolName,
        callId: context.callId,
      },
    });

    try {
      let rawOutput: unknown = null;
      if (executor) {
        rawOutput = await executor(effectiveContext);
      }

      const durationMs = Date.now() - start;
      const sanitizedOutput =
        typeof rawOutput === "string"
          ? this.secretRedactor.redact(rawOutput)
          : typeof rawOutput === "object" && rawOutput !== null
          ? this.secretRedactor.redactObject(rawOutput as Record<string, unknown>)
          : rawOutput;

      // Capture cryptographic evidence
      let evidenceId: string | undefined;
      try {
        const ev = await this.evidenceStore.storeEvidence({
          tenantId: context.tenantId,
          taskId: context.taskId,
          verificationRunId: context.runId,
          kind: "TOOL_INVOCATION",
          label: `Tool: ${context.toolName}`,
          content: JSON.stringify({
            toolName: context.toolName,
            args: this.secretRedactor.redactObject(effectiveContext.toolArguments),
            output: sanitizedOutput,
            durationMs,
          }),
        });
        evidenceId = ev.id;
      } catch {
        // Continue if evidence logging fails in lightweight mode
      }

      // Log tamper-evident audit record
      let auditEventId: string | undefined;
      try {
        const auditRec = await this.auditEngine.logSecurityEvent({
          tenantId: context.tenantId,
          actor: { id: context.agentId, type: "AGENT", tenantId: context.tenantId },
          eventType: "tool.executed",
          severity: "INFO",
          targetId: context.toolName,
          targetType: "TOOL",
          details: {
            toolName: context.toolName,
            durationMs,
            evidenceId,
          },
        });
        auditEventId = auditRec.id;
      } catch {
        // Continue if audit logging fails
      }

      this.eventBus.publish({
        eventType: "tool.completed",
        tenantId: context.tenantId,
        agentId: context.agentId,
        missionId: context.missionId,
        taskId: context.taskId,
        runId: context.runId,
        attemptId: context.attemptId,
        sessionId: context.sessionId,
        workspaceId: context.workspaceId,
        runtimeId: context.runtimeId,
        source: "tool.gateway",
        payload: {
          toolName: context.toolName,
          callId: context.callId,
          durationMs,
          evidenceId,
          auditEventId,
        },
      });

      return {
        success: true,
        output: sanitizedOutput,
        durationMs,
        evidenceId,
        auditEventId,
        modifiedParameters: authResult.modifiedParameters,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);

      this.eventBus.publish({
        eventType: "tool.failed",
        tenantId: context.tenantId,
        agentId: context.agentId,
        missionId: context.missionId,
        taskId: context.taskId,
        runId: context.runId,
        attemptId: context.attemptId,
        sessionId: context.sessionId,
        workspaceId: context.workspaceId,
        runtimeId: context.runtimeId,
        source: "tool.gateway",
        payload: {
          toolName: context.toolName,
          callId: context.callId,
          error: errorMsg,
          durationMs,
        },
      });

      return {
        success: false,
        error: errorMsg,
        durationMs,
      };
    }
  }
}

export const globalToolGateway = new ToolGateway();
