import crypto from "node:crypto";
import { PolicyEngine } from "@synapse/policy-engine";
import { SafetyEngine } from "@synapse/safety-engine";
import { ApprovalEngine } from "@synapse/approval-engine";
import { CapabilityRegistry, globalCapabilityRegistry } from "@synapse/capabilities";
import { AgentRegistry } from "@synapse/agent-registry";
import { EvidenceStore } from "@synapse/evidence";
import { AuditEngine } from "@synapse/audit-engine";
import { EventBus } from "@synapse/event-bus";
import { SecretRedactor } from "@synapse/secrets";
import { CapabilityAuthorizer } from "./CapabilityAuthorizer.js";
import { SafetyPolicyPipeline } from "./SafetyPolicyPipeline.js";
import {
  computeArgumentsHash,
  type AuthorizationToken,
  type ToolInvocationContext,
  type ToolAuthorizationResult,
  type ToolExecutionResult,
} from "./types.js";

export interface ToolGatewayOptions {
  policyEngine?: PolicyEngine;
  safetyEngine?: SafetyEngine;
  approvalEngine?: ApprovalEngine;
  agentRegistry?: AgentRegistry;
  capabilityRegistry?: CapabilityRegistry;
  evidenceStore?: EvidenceStore;
  auditEngine?: AuditEngine;
  eventBus?: EventBus;
  secretRedactor?: SecretRedactor;
  /** Duration in ms that an authorization token is valid (default: 30000ms / 30s) */
  authorizationTokenTtlMs?: number;
}

/**
 * The signing key is per-process and per-instance, preventing cross-process token forgery.
 * In production this would be derived from a hardware security module or KMS.
 */
const PROCESS_SIGNING_KEY = crypto.randomBytes(32).toString("hex");

export class ToolGateway {
  public readonly policyEngine: PolicyEngine;
  public readonly safetyEngine: SafetyEngine;
  public readonly approvalEngine: ApprovalEngine;
  public readonly agentRegistry?: AgentRegistry;
  public readonly capabilityRegistry: CapabilityRegistry;
  public readonly evidenceStore: EvidenceStore;
  public readonly auditEngine: AuditEngine;
  public readonly eventBus: EventBus;
  public readonly secretRedactor: SecretRedactor;

  private readonly pipeline: SafetyPolicyPipeline;
  private readonly authorizationTokenTtlMs: number;
  /** Track consumed authorization tokens to prevent replay */
  private readonly consumedTokens = new Set<string>();

  constructor(options?: ToolGatewayOptions) {
    this.policyEngine = options?.policyEngine ?? new PolicyEngine();
    this.safetyEngine = options?.safetyEngine ?? new SafetyEngine();
    this.approvalEngine = options?.approvalEngine ?? new ApprovalEngine();
    this.agentRegistry = options?.agentRegistry;
    this.capabilityRegistry = options?.capabilityRegistry ?? globalCapabilityRegistry;
    this.evidenceStore = options?.evidenceStore ?? new EvidenceStore();
    this.auditEngine = options?.auditEngine ?? new AuditEngine();
    this.eventBus = options?.eventBus ?? new EventBus();
    this.secretRedactor = options?.secretRedactor ?? new SecretRedactor();
    this.authorizationTokenTtlMs = options?.authorizationTokenTtlMs ?? 30_000;

    const capabilityAuthorizer = new CapabilityAuthorizer(this.agentRegistry, this.capabilityRegistry);
    this.pipeline = new SafetyPolicyPipeline(
      this.policyEngine,
      this.safetyEngine,
      capabilityAuthorizer
    );
  }

  /**
   * Generates a cryptographically signed authorization token binding the decision
   * to the exact call context and argument hash.
   */
  private generateAuthorizationToken(
    context: ToolInvocationContext,
    callId: string
  ): AuthorizationToken {
    const tokenId = crypto.randomUUID();
    const argumentsHash = computeArgumentsHash(context.toolArguments);
    const authorizedAt = Date.now();
    const expiresAt = authorizedAt + this.authorizationTokenTtlMs;
    const policyVersion = "1.0"; // Track policy version for audit

    const payload = `${tokenId}:${argumentsHash}:${callId}:${context.toolName}:${context.tenantId}:${context.agentId}:${context.sessionId}:${authorizedAt}:${expiresAt}:${policyVersion}`;
    const signature = crypto
      .createHmac("sha256", PROCESS_SIGNING_KEY)
      .update(payload)
      .digest("hex");

    return {
      tokenId,
      argumentsHash,
      callId,
      toolName: context.toolName,
      tenantId: context.tenantId,
      agentId: context.agentId,
      sessionId: context.sessionId,
      policyVersion,
      authorizedAt,
      expiresAt,
      signature,
    };
  }

  /**
   * Validates an authorization token against the current execution context.
   * Returns null if valid, error string if invalid.
   */
  public validateAuthorizationToken(
    token: AuthorizationToken,
    context: ToolInvocationContext,
    callId: string
  ): string | null {
    // 1. Check token hasn't been consumed (prevent replay)
    if (this.consumedTokens.has(token.tokenId)) {
      return "Authorization token already consumed (replay attack prevented)";
    }

    // 2. Check expiry
    if (Date.now() > token.expiresAt) {
      return `Authorization token expired at ${new Date(token.expiresAt).toISOString()}`;
    }

    // 3. Verify binding to exact context
    if (token.callId !== callId) {
      return `Authorization token bound to callId '${token.callId}', but execution attempted with '${callId}'`;
    }
    if (token.toolName !== context.toolName) {
      return `Authorization token bound to tool '${token.toolName}', but execution attempted with '${context.toolName}'`;
    }
    if (token.tenantId !== context.tenantId) {
      return `Authorization token tenant mismatch`;
    }
    if (token.agentId !== context.agentId) {
      return `Authorization token agent mismatch`;
    }
    if (token.sessionId !== context.sessionId) {
      return `Authorization token session mismatch`;
    }

    // 4. Verify arguments haven't been mutated since authorization
    const currentHash = computeArgumentsHash(context.toolArguments);
    if (currentHash !== token.argumentsHash) {
      return "Tool arguments were mutated after authorization (argument hash mismatch)";
    }

    // 5. Verify cryptographic signature
    const payload = `${token.tokenId}:${token.argumentsHash}:${token.callId}:${token.toolName}:${token.tenantId}:${token.agentId}:${token.sessionId}:${token.authorizedAt}:${token.expiresAt}:${token.policyVersion}`;
    const expectedSig = crypto
      .createHmac("sha256", PROCESS_SIGNING_KEY)
      .update(payload)
      .digest("hex");

    if (expectedSig !== token.signature) {
      return "Authorization token signature verification failed (tampered or forged token)";
    }

    return null; // Valid
  }

  /**
   * Consume (invalidate) an authorization token after successful execution.
   */
  private consumeAuthorizationToken(tokenId: string): void {
    this.consumedTokens.add(tokenId);
    // Prevent memory leak: periodically clean up old tokens
    if (this.consumedTokens.size > 10_000) {
      const iter = this.consumedTokens.values();
      for (let i = 0; i < 5_000; i++) {
        const val = iter.next();
        if (val.done) break;
        this.consumedTokens.delete(val.value);
      }
    }
  }

  /**
   * Evaluates and authoritatively authorizes a proposed tool execution.
   * Returns an authorization result with a cryptographic AuthorizationToken
   * that must be presented during executeTool() to prove the authorization
   * is bound to exactly this tool call with exactly these arguments.
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
        // Generate authorization token for the approved call
        const authToken = this.generateAuthorizationToken(context, callId);

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
            authorizationTokenId: authToken.tokenId,
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
          payload: {
            toolName: context.toolName,
            callId,
            authorized: true,
            authorizationTokenId: authToken.tokenId,
          },
        });

        return {
          authorized: true,
          decision: "ALLOW",
          reason: "Approved by Operator",
          riskLevel: pipelineResult.riskLevel,
          modifiedParameters: (approvalResolution.approvedParameters as Record<string, unknown>) || undefined,
          approvalRequestId: approvalResolution.requestId,
          authorizationToken: authToken,
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

    // 5. Handle ALLOW decision — generate authorization token
    const authToken = this.generateAuthorizationToken(context, callId);

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
        authorizationTokenId: authToken.tokenId,
      },
    });

    return {
      authorized: true,
      decision: "ALLOW",
      reason: pipelineResult.reason,
      riskLevel: pipelineResult.riskLevel,
      authorizationToken: authToken,
      timestamp,
    };
  }

  /**
   * Authoritative tool execution boundary.
   *
   * This is the ONLY path through which a tool may be executed.
   * It enforces:
   * 1. Authorization token validation (CR2 — arguments hash binding)
   * 2. Evidence capture with fail-closed behavior for HIGH/CRITICAL risk (CR5)
   * 3. Tamper-evident audit recording
   * 4. Full event correlation (CR13)
   * 5. Token consumption (prevents replay)
   */
  public async executeTool(
    context: ToolInvocationContext,
    executor?: (ctx: ToolInvocationContext) => Promise<unknown>,
    authorizationToken?: AuthorizationToken
  ): Promise<ToolExecutionResult> {
    const callId = context.callId || crypto.randomUUID();

    // If no authorization token provided, run authorization inline
    let riskLevel: string = "LOW";
    if (!authorizationToken) {
      const authResult = await this.evaluateAndAuthorizeToolCall(context);
      if (!authResult.authorized) {
        return {
          success: false,
          error: authResult.reason,
          durationMs: 0,
        };
      }
      authorizationToken = authResult.authorizationToken;
      riskLevel = authResult.riskLevel;

      // Apply modified parameters if authorization changed them
      if (authResult.modifiedParameters) {
        context = { ...context, toolArguments: authResult.modifiedParameters };
      }
    }

    // Validate authorization token if present
    if (authorizationToken) {
      const tokenError = this.validateAuthorizationToken(authorizationToken, context, callId);
      if (tokenError) {
        this.eventBus.publish({
          eventType: "tool.authorization_invalid",
          tenantId: context.tenantId,
          agentId: context.agentId,
          sessionId: context.sessionId,
          source: "tool.gateway",
          payload: {
            toolName: context.toolName,
            callId,
            error: tokenError,
          },
        });

        await this.auditEngine.logSecurityEvent({
          tenantId: context.tenantId,
          actor: { id: context.agentId, type: "AGENT", tenantId: context.tenantId },
          eventType: "tool.authorization_invalid",
          severity: "CRITICAL",
          targetId: context.toolName,
          targetType: "TOOL",
          details: {
            callId,
            error: tokenError,
            tokenId: authorizationToken.tokenId,
          },
        });

        return {
          success: false,
          error: `Authorization invalid: ${tokenError}`,
          durationMs: 0,
        };
      }

      riskLevel = authorizationToken.policyVersion ? riskLevel : "LOW";

      // Consume the token to prevent replay
      this.consumeAuthorizationToken(authorizationToken.tokenId);
    }

    const start = Date.now();
    const effectiveContext = context;

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
        callId,
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

      // CR5: Governance Recording — risk-level-aware fail behavior
      let evidenceId: string | undefined;
      let evidenceFailed = false;
      try {
        const ev = await this.evidenceStore.storeEvidence({
          tenantId: context.tenantId,
          taskId: context.taskId,
          verificationRunId: context.runId,
          kind: "TOOL_INVOCATION",
          label: `Tool: ${context.toolName}`,
          content: JSON.stringify({
            toolName: context.toolName,
            callId,
            args: this.secretRedactor.redactObject(effectiveContext.toolArguments),
            output: sanitizedOutput,
            durationMs,
            authorizationTokenId: authorizationToken?.tokenId,
          }),
        });
        evidenceId = ev.id;
      } catch (evidenceError) {
        evidenceFailed = true;
        // CR5: Fail-closed behavior based on risk level
        if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
          this.eventBus.publish({
            eventType: "tool.evidence_failure",
            tenantId: context.tenantId,
            agentId: context.agentId,
            sessionId: context.sessionId,
            source: "tool.gateway",
            payload: {
              toolName: context.toolName,
              callId,
              riskLevel,
              error: "Evidence persistence failed for HIGH/CRITICAL risk operation — BLOCKED",
            },
          });
          return {
            success: false,
            error: `Evidence capture failed for ${riskLevel}-risk operation. Execution result discarded for safety. Error: ${evidenceError instanceof Error ? evidenceError.message : String(evidenceError)}`,
            durationMs,
          };
        }
        // LOW/MEDIUM: warning, continue
      }

      // Audit record — same fail-closed logic
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
            callId,
            durationMs,
            evidenceId,
            authorizationTokenId: authorizationToken?.tokenId,
            evidenceFailed,
          },
        });
        auditEventId = auditRec.id;
      } catch (auditError) {
        if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
          return {
            success: false,
            error: `Audit recording failed for ${riskLevel}-risk operation. Execution result discarded for safety. Error: ${auditError instanceof Error ? auditError.message : String(auditError)}`,
            durationMs,
          };
        }
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
          callId,
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
        modifiedParameters: undefined,
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
          callId,
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
