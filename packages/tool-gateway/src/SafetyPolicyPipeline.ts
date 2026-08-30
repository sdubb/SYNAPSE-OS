import { PolicyEngine } from "@synapse/policy-engine";
import { SafetyEngine } from "@synapse/safety-engine";
import { WorkspaceEnforcer } from "./WorkspaceEnforcer.js";
import { CapabilityAuthorizer } from "./CapabilityAuthorizer.js";
import type { ToolInvocationContext, ToolAuthorizationStatus } from "./types.js";
import type { PolicyRiskLevel } from "@synapse/contracts";

export interface PipelineEvaluationResult {
  readonly authorized: boolean;
  readonly decision: ToolAuthorizationStatus;
  readonly reason: string;
  readonly remediation?: string;
  readonly riskLevel: PolicyRiskLevel;
  readonly modifiedParameters?: Record<string, unknown>;
}

export class SafetyPolicyPipeline {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly safetyEngine: SafetyEngine,
    private readonly capabilityAuthorizer: CapabilityAuthorizer = new CapabilityAuthorizer()
  ) {}

  /**
   * Evaluates the proposed tool call across all governance layers in strict precedence order.
   */
  public evaluate(context: ToolInvocationContext): PipelineEvaluationResult {
    // 0. PRECEDENCE LEVEL 0: Multi-Tenant Context & Scope Boundary Check
    if (!context.tenantId) {
      return {
        authorized: false,
        decision: "BLOCK",
        reason: "Tenant context is required but no active tenant context was found in the current execution scope.",
        remediation: "Specify a valid tenantId in the execution context.",
        riskLevel: "CRITICAL",
      };
    }

    if (context.workspaceRoot) {
      const lowerWs = context.workspaceRoot.toLowerCase();
      const lowerTenant = context.tenantId.toLowerCase();
      // If the workspace root explicitly mentions a specific tenant identifier that does not match this tenant
      const otherTenantMatch = lowerWs.match(/tenant[_\-]([a-zA-Z0-9_\-]+)/i);
      if (otherTenantMatch && !lowerTenant.includes(otherTenantMatch[1].toLowerCase()) && !otherTenantMatch[1].toLowerCase().includes(lowerTenant)) {
        return {
          authorized: false,
          decision: "BLOCK",
          reason: `Zero-trust tenant isolation violation: Workspace root '${context.workspaceRoot}' belongs to a different tenant scope (${otherTenantMatch[0]})`,
          remediation: "Ensure file operations remain strictly within the assigned tenant's isolated workspace",
          riskLevel: "CRITICAL",
        };
      }
    }

    const killSwitch = this.safetyEngine.getKillSwitch();

    // 1. PRECEDENCE LEVEL 1: System Kill Switch Check
    if (killSwitch.isContextStopped({
      sessionId: context.sessionId,
      agentId: context.agentId,
      runtimeId: context.runtimeId,
      tenantId: context.tenantId,
    })) {
      return {
        authorized: false,
        decision: "BLOCK",
        reason: `Execution halted: Context was stopped by Emergency Kill Switch (Level 2 or Scope kill)`,
        remediation: "Restart the session or revoke the emergency halt directive",
        riskLevel: "CRITICAL",
      };
    }

    if (context.workspaceRoot && killSwitch.isWorkspaceLocked(context.workspaceRoot)) {
      return {
        authorized: false,
        decision: "BLOCK",
        reason: `Execution halted: Workspace '${context.workspaceRoot}' is locked by Emergency Kill Switch Level 3`,
        remediation: "Unlock workspace and verify integrity before retrying",
        riskLevel: "CRITICAL",
      };
    }

    // 2. PRECEDENCE LEVEL 2: Safety Engine Risk & Secret / Prompt Injection Analysis
    const safetyAssessment = this.safetyEngine.analyzeRisk({
      toolName: context.toolName,
      args: context.toolArguments,
      workspaceRoot: context.workspaceRoot,
    });

    if (safetyAssessment.riskLevel === "CRITICAL") {
      const descriptions = safetyAssessment.factors.map((f) => f.description).join("; ");
      return {
        authorized: false,
        decision: "BLOCK",
        reason: `Safety Engine CRITICAL risk block: ${descriptions || "Dangerous operation detected"}`,
        remediation: "Review tool parameters to avoid high-risk or destructive actions",
        riskLevel: "CRITICAL",
      };
    }

    // 3. PRECEDENCE LEVEL 3: Workspace & Path Traversal Boundary Enforcer
    const pathArg = this.extractFilePath(context.toolArguments);
    if (pathArg) {
      const isWrite = this.isWriteOperation(context.toolName);
      const wsCheck = WorkspaceEnforcer.validatePathAccess(pathArg, isWrite, {
        workspaceRoot: context.workspaceRoot,
      });

      if (!wsCheck.valid) {
        return {
          authorized: false,
          decision: "BLOCK",
          reason: wsCheck.error || "Path boundary violation",
          remediation: "Keep file operations strictly inside the assigned workspace root directory.",
          riskLevel: "CRITICAL",
        };
      }
    }

    // 4. PRECEDENCE LEVEL 4: Policy Engine Evaluation
    const policyResult = this.evaluatePolicy(context);
    if (policyResult.decision === "BLOCK") {
      return {
        authorized: false,
        decision: "BLOCK",
        reason: policyResult.reason || "Blocked by tenant security policy",
        remediation: policyResult.remediation,
        riskLevel: (policyResult.riskLevel as PolicyRiskLevel) || safetyAssessment.riskLevel,
      };
    }

    // 5. PRECEDENCE LEVEL 5: Capability Authorization
    const capCheck = this.capabilityAuthorizer.checkCapability(
      context.toolName,
      context.agentId,
      context.allowedCapabilities
    );
    if (!capCheck.authorized) {
      return {
        authorized: false,
        decision: "BLOCK",
        reason: capCheck.reason || `Agent missing capability for tool '${context.toolName}'`,
        remediation: "Grant required capability in the agent's manifest before executing this action",
        riskLevel: "HIGH",
      };
    }

    // 6. PRECEDENCE LEVEL 6: Approval Requirement Check
    if (policyResult.decision === "REQUIRE_APPROVAL" || safetyAssessment.riskLevel === "HIGH") {
      return {
        authorized: false,
        decision: "REQUIRE_APPROVAL",
        reason: policyResult.reason || `Action requires human operator sign-off (Risk Level: ${safetyAssessment.riskLevel})`,
        remediation: "Submit approval request to human supervisor or operator dashboard",
        riskLevel: (policyResult.riskLevel as PolicyRiskLevel) || safetyAssessment.riskLevel,
      };
    }

    // 7. PRECEDENCE LEVEL 7: Policy Allowed
    return {
      authorized: true,
      decision: "ALLOW",
      reason: policyResult.reason || "Action permitted by safety and policy evaluation",
      riskLevel: (policyResult.riskLevel as PolicyRiskLevel) || "LOW",
    };
  }

  private evaluatePolicy(context: ToolInvocationContext) {
    const lower = context.toolName.toLowerCase();
    const args = context.toolArguments;

    if (lower.includes("command") || lower.includes("execute") || lower.includes("bash") || lower.includes("shell")) {
      const cmd = String(args["command"] || args["CommandLine"] || args["cmd"] || "");
      return this.policyEngine.evaluateCommand(context.tenantId, cmd, context.workspaceRoot, {
        agentId: context.agentId,
        sessionId: context.sessionId,
        taskId: context.taskId,
        workspaceId: context.workspaceId,
        userId: context.userId,
      });
    }

    if (lower.includes("read") || lower.includes("write") || lower.includes("edit") || lower.includes("replace")) {
      const filePath = this.extractFilePath(args) || "";
      const isWrite = this.isWriteOperation(context.toolName);
      return this.policyEngine.evaluateFileAccess(context.tenantId, filePath, isWrite, context.workspaceRoot, {
        agentId: context.agentId,
        sessionId: context.sessionId,
        taskId: context.taskId,
        userId: context.userId,
      });
    }

    if (lower.includes("http") || lower.includes("fetch") || lower.includes("network")) {
      const url = String(args["url"] || args["targetUrl"] || "");
      const method = String(args["method"] || "GET");
      return this.policyEngine.evaluateNetworkRequest(context.tenantId, url, method, {
        agentId: context.agentId,
        sessionId: context.sessionId,
      });
    }

    // General tool call
    return this.policyEngine.evaluateToolCall(context.tenantId, context.toolName, args, {
      agentId: context.agentId,
      sessionId: context.sessionId,
      taskId: context.taskId,
      workspaceId: context.workspaceId,
      workspaceRoot: context.workspaceRoot,
      userId: context.userId,
    });
  }

  private extractFilePath(args: Record<string, unknown>): string | null {
    const directPath = args["path"] || args["filePath"] || args["targetFile"] || args["TargetFile"] || args["file"];
    if (typeof directPath === "string") return directPath;
    return null;
  }

  private isWriteOperation(toolName: string): boolean {
    const lower = toolName.toLowerCase();
    return (
      lower.includes("write") ||
      lower.includes("edit") ||
      lower.includes("replace") ||
      lower.includes("delete") ||
      lower.includes("remove") ||
      lower.includes("create")
    );
  }
}
