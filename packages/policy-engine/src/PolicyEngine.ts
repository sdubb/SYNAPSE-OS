import { PolicyContext, type CreatePolicyContextInput } from "./PolicyContext.js";
import { PolicyDecision } from "./PolicyDecision.js";
import { PolicyEvaluator, type EvaluatorOptions } from "./PolicyEvaluator.js";
import {
  type PolicyConfig,
  type PolicyRuleDefinition,
} from "./schemas/policy.schema.js";

export interface PolicyEngineOptions extends EvaluatorOptions {
  tenantConfigs?: Map<string, PolicyConfig>;
}

export class PolicyEngine {
  private evaluators: Map<string, PolicyEvaluator> = new Map();
  private globalEvaluator: PolicyEvaluator;

  constructor(options?: PolicyEngineOptions) {
    this.globalEvaluator = new PolicyEvaluator({
      defaultDecision: "ALLOW",
      defaultRiskLevel: "LOW",
      ...options,
    });

    if (options?.tenantConfigs) {
      for (const [tenantId, config] of options.tenantConfigs) {
        this.setTenantPolicy(tenantId, config);
      }
    }
  }

  /**
   * Sets or updates the policy configuration for a specific tenant.
   */
  public setTenantPolicy(tenantId: string, config: PolicyConfig): void {
    const evaluator = new PolicyEvaluator({
      config,
      enableBuiltInRules: true,
      strictMode: config.strictMode,
      defaultDecision: config.defaultDecision,
      defaultRiskLevel: config.defaultRiskLevel,
    });
    this.evaluators.set(tenantId, evaluator);
  }

  /**
   * Adds a dynamic rule to a specific tenant or global evaluator.
   */
  public addRule(rule: PolicyRuleDefinition, tenantId?: string): void {
    if (tenantId && this.evaluators.has(tenantId)) {
      this.evaluators.get(tenantId)!.addRule(rule);
    } else {
      this.globalEvaluator.addRule(rule);
    }
  }

  /**
   * Evaluates an arbitrary execution context.
   */
  public evaluate(context: PolicyContext | CreatePolicyContextInput): PolicyDecision {
    const ctx = context instanceof PolicyContext ? context : new PolicyContext(context);
    const evaluator = this.evaluators.get(ctx.tenantId) ?? this.globalEvaluator;
    return evaluator.evaluate(ctx);
  }

  /**
   * Evaluates a proposed tool execution.
   */
  public evaluateToolCall(
    tenantId: string,
    toolName: string,
    args: Record<string, unknown>,
    options?: {
      agentId?: string;
      sessionId?: string;
      taskId?: string;
      workspaceId?: string;
      workspaceRoot?: string;
      userId?: string;
      userRole?: string;
    }
  ): PolicyDecision {
    const ctx = new PolicyContext({
      tenantId,
      toolName,
      args,
      ...options,
    });
    return this.evaluate(ctx);
  }

  /**
   * Evaluates a shell command execution before spawning child processes.
   */
  public evaluateCommand(
    tenantId: string,
    command: string,
    workspaceRoot?: string,
    options?: {
      agentId?: string;
      sessionId?: string;
      taskId?: string;
      workspaceId?: string;
      userId?: string;
    }
  ): PolicyDecision {
    const ctx = new PolicyContext({
      tenantId,
      toolName: "execute_command",
      action: "shell:execute",
      target: command,
      args: { command, CommandLine: command },
      workspaceRoot,
      ...options,
    });
    return this.evaluate(ctx);
  }

  /**
   * Evaluates a filesystem access or mutation request.
   */
  public evaluateFileAccess(
    tenantId: string,
    filePath: string,
    isWrite: boolean,
    workspaceRoot?: string,
    options?: {
      agentId?: string;
      sessionId?: string;
      taskId?: string;
      content?: string;
      userId?: string;
    }
  ): PolicyDecision {
    const ctx = new PolicyContext({
      tenantId,
      toolName: isWrite ? "write_to_file" : "read_file",
      action: isWrite ? "fs:write" : "fs:read",
      target: filePath,
      args: {
        path: filePath,
        targetFile: filePath,
        isWrite,
        ...(options?.content ? { content: options.content } : {}),
      },
      workspaceRoot,
      ...options,
    });
    return this.evaluate(ctx);
  }

  /**
   * Evaluates an outgoing network connection or HTTP request.
   */
  public evaluateNetworkRequest(
    tenantId: string,
    url: string,
    method = "GET",
    options?: {
      agentId?: string;
      sessionId?: string;
      headers?: Record<string, string>;
      body?: unknown;
    }
  ): PolicyDecision {
    const ctx = new PolicyContext({
      tenantId,
      toolName: "http_request",
      action: "network:request",
      target: url,
      args: {
        url,
        method,
        headers: options?.headers,
        body: options?.body,
      },
      ...options,
    });
    return this.evaluate(ctx);
  }
}
