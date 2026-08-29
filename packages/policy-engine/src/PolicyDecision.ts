import {
  type PolicyDecisionType,
  type RiskLevel,
  type PolicyEvaluationResult,
} from "./schemas/policy.schema.js";

export interface PolicyDecisionOptions {
  decision: PolicyDecisionType;
  riskLevel: RiskLevel;
  reason: string;
  remediation?: string;
  matchedRuleId?: string;
  matchedRuleName?: string;
  matchedCategory?: string;
  violations?: string[];
  riskScore?: number;
  evaluatedRulesCount?: number;
  evaluationDurationMs?: number;
  metadata?: Record<string, unknown>;
}

export class PolicyDecision {
  public readonly decision: PolicyDecisionType;
  public readonly riskLevel: RiskLevel;
  public readonly allowed: boolean;
  public readonly requiresApproval: boolean;
  public readonly blocked: boolean;
  public readonly reason: string;
  public readonly remediation?: string;
  public readonly matchedRuleId?: string;
  public readonly matchedRuleName?: string;
  public readonly matchedCategory?: string;
  public readonly violations: readonly string[];
  public readonly riskScore: number;
  public readonly evaluatedRulesCount: number;
  public readonly evaluationDurationMs: number;
  public readonly timestamp: number;
  public readonly metadata: Readonly<Record<string, unknown>>;

  constructor(options: PolicyDecisionOptions) {
    this.decision = options.decision;
    this.riskLevel = options.riskLevel;
    this.allowed = options.decision === "ALLOW";
    this.requiresApproval = options.decision === "REQUIRE_APPROVAL";
    this.blocked = options.decision === "BLOCK";
    this.reason = options.reason;
    this.remediation = options.remediation;
    this.matchedRuleId = options.matchedRuleId;
    this.matchedRuleName = options.matchedRuleName;
    this.matchedCategory = options.matchedCategory;
    this.violations = Object.freeze([...(options.violations ?? [])]);
    this.riskScore = options.riskScore ?? this.calculateDefaultRiskScore(options.riskLevel, options.decision);
    this.evaluatedRulesCount = options.evaluatedRulesCount ?? 0;
    this.evaluationDurationMs = options.evaluationDurationMs ?? 0;
    this.timestamp = Date.now();
    this.metadata = Object.freeze({ ...(options.metadata ?? {}) });
  }

  public isAllowed(): boolean {
    return this.allowed;
  }

  public isBlocked(): boolean {
    return this.blocked;
  }

  public isApprovalRequired(): boolean {
    return this.requiresApproval;
  }

  public toJSON(): PolicyEvaluationResult {
    return {
      decision: this.decision,
      riskLevel: this.riskLevel,
      allowed: this.allowed,
      requiresApproval: this.requiresApproval,
      blocked: this.blocked,
      reason: this.reason,
      remediation: this.remediation,
      matchedRuleId: this.matchedRuleId,
      matchedRuleName: this.matchedRuleName,
      matchedCategory: this.matchedCategory,
      violations: [...this.violations],
      riskScore: this.riskScore,
      evaluatedRulesCount: this.evaluatedRulesCount,
      evaluationDurationMs: this.evaluationDurationMs,
      timestamp: this.timestamp,
      metadata: { ...this.metadata },
    };
  }

  public static allow(reason: string, options?: Partial<PolicyDecisionOptions>): PolicyDecision {
    return new PolicyDecision({
      decision: "ALLOW",
      riskLevel: options?.riskLevel ?? "LOW",
      reason,
      riskScore: options?.riskScore ?? 10,
      ...options,
    });
  }

  public static block(reason: string, options?: Partial<PolicyDecisionOptions>): PolicyDecision {
    return new PolicyDecision({
      decision: "BLOCK",
      riskLevel: options?.riskLevel ?? "CRITICAL",
      reason,
      riskScore: options?.riskScore ?? 95,
      ...options,
    });
  }

  public static requireApproval(reason: string, options?: Partial<PolicyDecisionOptions>): PolicyDecision {
    return new PolicyDecision({
      decision: "REQUIRE_APPROVAL",
      riskLevel: options?.riskLevel ?? "HIGH",
      reason,
      riskScore: options?.riskScore ?? 65,
      ...options,
    });
  }

  private calculateDefaultRiskScore(riskLevel: RiskLevel, decision: PolicyDecisionType): number {
    switch (riskLevel) {
      case "LOW":
        return decision === "ALLOW" ? 10 : 25;
      case "MEDIUM":
        return 45;
      case "HIGH":
        return 75;
      case "CRITICAL":
        return 95;
    }
  }
}
