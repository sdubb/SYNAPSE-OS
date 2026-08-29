import { type PolicyRiskLevel } from "@synapse/contracts";
import { type BlastRadiusAssessment } from "./BlastRadius.js";
import { type SecretScanResult } from "./SecretDetector.js";
import { type InjectionScanResult } from "./PromptInjectionDetector.js";
export interface ToolRiskInput {
    toolName: string;
    args: Record<string, unknown>;
    workspaceRoot?: string;
    userPrompt?: string;
}
export interface RiskFactor {
    category: "TOOL_TYPE" | "BLAST_RADIUS" | "SECRETS" | "PROMPT_INJECTION" | "DESTRUCTIVE";
    severity: PolicyRiskLevel;
    weight: number;
    description: string;
}
export interface CompositeRiskAssessment {
    riskLevel: PolicyRiskLevel;
    compositeScore: number;
    factors: RiskFactor[];
    blastRadius: BlastRadiusAssessment;
    secretScan: SecretScanResult;
    injectionScan: InjectionScanResult;
    requiresApproval: boolean;
}
export declare class RiskClassifier {
    static classify(input: ToolRiskInput): CompositeRiskAssessment;
    private static getToolBaseRisk;
    private static scoreToLevel;
}
//# sourceMappingURL=RiskClassifier.d.ts.map