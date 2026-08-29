import { type PolicyRiskLevel } from "@synapse/contracts";

export interface ApprovalRequirement {
  riskLevel: PolicyRiskLevel;
  requiredApproverCount: number;
  allowedRoles: readonly string[];
  allowSelfApproval: boolean;
  timeoutSeconds: number;
  autoApprove: boolean;
}

export const DEFAULT_APPROVAL_REQUIREMENTS: Record<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL", ApprovalRequirement> = {
  LOW: {
    riskLevel: "LOW",
    requiredApproverCount: 0,
    allowedRoles: ["developer", "operator", "admin", "owner"],
    allowSelfApproval: true,
    timeoutSeconds: 3600,
    autoApprove: true,
  },
  MEDIUM: {
    riskLevel: "MEDIUM",
    requiredApproverCount: 1,
    allowedRoles: ["developer", "operator", "admin", "owner"],
    allowSelfApproval: true,
    timeoutSeconds: 1800, // 30 mins
    autoApprove: false,
  },
  HIGH: {
    riskLevel: "HIGH",
    requiredApproverCount: 1,
    allowedRoles: ["operator", "admin", "owner"],
    allowSelfApproval: false,
    timeoutSeconds: 900, // 15 mins
    autoApprove: false,
  },
  CRITICAL: {
    riskLevel: "CRITICAL",
    requiredApproverCount: 2, // 2-Person multi-party authorization rule
    allowedRoles: ["admin", "owner"],
    allowSelfApproval: false,
    timeoutSeconds: 600, // 10 mins
    autoApprove: false,
  },
};

export class ApprovalPolicy {
  private requirements: Map<string, ApprovalRequirement> = new Map();

  constructor(customRequirements?: Partial<Record<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL", Partial<ApprovalRequirement>>>) {
    const entries = [
      ["LOW", DEFAULT_APPROVAL_REQUIREMENTS.LOW],
      ["MEDIUM", DEFAULT_APPROVAL_REQUIREMENTS.MEDIUM],
      ["HIGH", DEFAULT_APPROVAL_REQUIREMENTS.HIGH],
      ["CRITICAL", DEFAULT_APPROVAL_REQUIREMENTS.CRITICAL],
    ] as const;

    for (const [level, defaultReq] of entries) {
      const custom = customRequirements?.[level];
      this.requirements.set(level, {
        ...defaultReq,
        ...(custom ?? {}),
      });
    }
  }

  public getRequirement(riskLevel: PolicyRiskLevel): ApprovalRequirement {
    const req = this.requirements.get(riskLevel);
    if (!req) {
      return DEFAULT_APPROVAL_REQUIREMENTS["MEDIUM"];
    }
    return req;
  }

  public isAutoApproved(riskLevel: PolicyRiskLevel): boolean {
    return this.getRequirement(riskLevel).autoApprove;
  }

  public getRequiredCount(riskLevel: PolicyRiskLevel): number {
    return this.getRequirement(riskLevel).requiredApproverCount;
  }

  public getAllowedRoles(riskLevel: PolicyRiskLevel): readonly string[] {
    return this.getRequirement(riskLevel).allowedRoles;
  }

  public getTimeoutSeconds(riskLevel: PolicyRiskLevel): number {
    return this.getRequirement(riskLevel).timeoutSeconds;
  }
}
