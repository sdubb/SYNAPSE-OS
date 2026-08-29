import { type PolicyContext } from "./PolicyContext.js";
import { PolicyDecision } from "./PolicyDecision.js";
import { PolicyCompiler, type CompiledPolicyRule } from "./PolicyCompiler.js";
import {
  evaluateFilesystemPolicy,
  evaluateShellPolicy,
  evaluateNetworkPolicy,
  evaluateGitPolicy,
  evaluateSecretsPolicy,
  evaluateDestructivePolicy,
} from "./rules/index.js";
import {
  type PolicyConfig,
  type PolicyDecisionType,
  type RiskLevel,
} from "./schemas/policy.schema.js";

export interface EvaluatorOptions {
  config?: PolicyConfig;
  enableBuiltInRules?: boolean;
  strictMode?: boolean;
  defaultDecision?: PolicyDecisionType;
  defaultRiskLevel?: RiskLevel;
}

export class PolicyEvaluator {
  private compiledRules: CompiledPolicyRule[] = [];
  private readonly options: EvaluatorOptions;

  constructor(options?: EvaluatorOptions) {
    this.options = {
      enableBuiltInRules: true,
      strictMode: true,
      defaultDecision: "REQUIRE_APPROVAL",
      defaultRiskLevel: "MEDIUM",
      ...options,
    };

    if (this.options.config) {
      this.loadConfig(this.options.config);
    }
  }

  public loadConfig(config: PolicyConfig): void {
    this.compiledRules = PolicyCompiler.compileConfig(config);
  }

  public addRule(rule: Parameters<typeof PolicyCompiler.compileRule>[0]): void {
    const compiled = PolicyCompiler.compileRule(rule);
    this.compiledRules.push(compiled);
    this.compiledRules.sort((a, b) => (b.definition.priority ?? 100) - (a.definition.priority ?? 100));
  }

  /**
   * Evaluates the policy context through all built-in security vectors and user-defined rules.
   */
  public evaluate(context: PolicyContext): PolicyDecision {
    const startTime = performance.now();
    let evaluatedCount = 0;
    const allViolations: string[] = [];

    try {
      // Phase 1: Built-in safety vectors (Critical baseline)
      if (this.options.enableBuiltInRules !== false) {
        // 1. Secrets Protection
        const secretDecision = evaluateSecretsPolicy(context);
        evaluatedCount++;
        if (secretDecision) {
          return this.finalizeDecision(secretDecision, startTime, evaluatedCount);
        }

        // 2. Shell AST Analysis
        const shellDecision = evaluateShellPolicy(context);
        evaluatedCount++;
        if (shellDecision) {
          return this.finalizeDecision(shellDecision, startTime, evaluatedCount);
        }

        // 3. Filesystem Path Containment
        const fsDecision = evaluateFilesystemPolicy(context);
        evaluatedCount++;
        if (fsDecision) {
          return this.finalizeDecision(fsDecision, startTime, evaluatedCount);
        }

        // 4. Network SSRF & Domain Restrictions
        const netDecision = evaluateNetworkPolicy(context);
        evaluatedCount++;
        if (netDecision) {
          return this.finalizeDecision(netDecision, startTime, evaluatedCount);
        }

        // 5. Git Branch Protection
        const gitDecision = evaluateGitPolicy(context);
        evaluatedCount++;
        if (gitDecision) {
          return this.finalizeDecision(gitDecision, startTime, evaluatedCount);
        }

        // 6. Destructive Operation Detection
        const destructiveDecision = evaluateDestructivePolicy(context);
        evaluatedCount++;
        if (destructiveDecision) {
          return this.finalizeDecision(destructiveDecision, startTime, evaluatedCount);
        }
      }

      // Phase 2: Compiled user & tenant declarative rules
      for (const rule of this.compiledRules) {
        evaluatedCount++;
        const decision = rule.evaluate(context);
        if (decision) {
          return this.finalizeDecision(decision, startTime, evaluatedCount);
        }
      }

      // Phase 3: Default fallback decision
      const defaultDecisionType = this.options.defaultDecision ?? "REQUIRE_APPROVAL";
      const defaultRisk = this.options.defaultRiskLevel ?? "MEDIUM";
      const durationMs = performance.now() - startTime;

      if (defaultDecisionType === "ALLOW") {
        return PolicyDecision.allow("Action allowed by default policy", {
          riskLevel: defaultRisk,
          evaluatedRulesCount: evaluatedCount,
          evaluationDurationMs: durationMs,
          violations: allViolations,
        });
      }

      if (defaultDecisionType === "BLOCK") {
        return PolicyDecision.block("Action blocked by default restrictive policy", {
          riskLevel: defaultRisk,
          evaluatedRulesCount: evaluatedCount,
          evaluationDurationMs: durationMs,
          violations: allViolations,
        });
      }

      return PolicyDecision.requireApproval("Action requires human authorization under default policy", {
        riskLevel: defaultRisk,
        evaluatedRulesCount: evaluatedCount,
        evaluationDurationMs: durationMs,
        violations: allViolations,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const durationMs = performance.now() - startTime;

      if (this.options.strictMode) {
        return PolicyDecision.block(`Policy evaluation error (fail-closed strict mode): ${errorMsg}`, {
          riskLevel: "CRITICAL",
          evaluatedRulesCount: evaluatedCount,
          evaluationDurationMs: durationMs,
          violations: [`Evaluation exception: ${errorMsg}`],
        });
      }

      return PolicyDecision.requireApproval(`Policy evaluation warning: ${errorMsg}`, {
        riskLevel: "HIGH",
        evaluatedRulesCount: evaluatedCount,
        evaluationDurationMs: durationMs,
        violations: [`Evaluation exception: ${errorMsg}`],
      });
    }
  }

  private finalizeDecision(
    decision: PolicyDecision,
    startTime: number,
    evaluatedCount: number
  ): PolicyDecision {
    const durationMs = performance.now() - startTime;
    return new PolicyDecision({
      decision: decision.decision,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      remediation: decision.remediation,
      matchedRuleId: decision.matchedRuleId,
      matchedRuleName: decision.matchedRuleName,
      matchedCategory: decision.matchedCategory,
      violations: [...decision.violations],
      riskScore: decision.riskScore,
      evaluatedRulesCount: evaluatedCount,
      evaluationDurationMs: durationMs,
      metadata: decision.metadata,
    });
  }
}
