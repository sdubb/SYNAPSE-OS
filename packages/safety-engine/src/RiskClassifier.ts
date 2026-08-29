import { type PolicyRiskLevel } from "@synapse/contracts";
import { BlastRadiusCalculator, type BlastRadiusAssessment } from "./BlastRadius.js";
import { SecretDetector, type SecretScanResult } from "./SecretDetector.js";
import { PromptInjectionDetector, type InjectionScanResult } from "./PromptInjectionDetector.js";

export interface ToolRiskInput {
  toolName: string;
  args: Record<string, unknown>;
  workspaceRoot?: string;
  userPrompt?: string;
}

export interface RiskFactor {
  category: "TOOL_TYPE" | "BLAST_RADIUS" | "SECRETS" | "PROMPT_INJECTION" | "DESTRUCTIVE";
  severity: PolicyRiskLevel;
  weight: number; // 0-100
  description: string;
}

export interface CompositeRiskAssessment {
  riskLevel: PolicyRiskLevel;
  compositeScore: number; // 0 to 100
  factors: RiskFactor[];
  blastRadius: BlastRadiusAssessment;
  secretScan: SecretScanResult;
  injectionScan: InjectionScanResult;
  requiresApproval: boolean;
}

export class RiskClassifier {
  public static classify(input: ToolRiskInput): CompositeRiskAssessment {
    const factors: RiskFactor[] = [];
    let score = 0;

    // 1. Tool Category Base Risk
    const toolBaseScore = this.getToolBaseRisk(input.toolName, input.args);
    score += toolBaseScore.score;
    factors.push({
      category: "TOOL_TYPE",
      severity: this.scoreToLevel(toolBaseScore.score),
      weight: toolBaseScore.score,
      description: toolBaseScore.description,
    });

    // 2. Blast Radius Assessment
    let blastRadius: BlastRadiusAssessment;
    const commandStr = (typeof input.args["command"] === "string" ? input.args["command"] : typeof input.args["CommandLine"] === "string" ? input.args["CommandLine"] : "") as string;
    const filePath = (typeof input.args["targetFile"] === "string" ? input.args["targetFile"] : typeof input.args["TargetFile"] === "string" ? input.args["TargetFile"] : typeof input.args["path"] === "string" ? input.args["path"] : "") as string;

    if (commandStr) {
      blastRadius = BlastRadiusCalculator.calculateCommandOperation(commandStr, input.workspaceRoot);
    } else if (filePath) {
      const isWrite = input.toolName.includes("write") || input.toolName.includes("replace");
      blastRadius = BlastRadiusCalculator.calculateFileOperation(filePath, isWrite ? "write" : "read", input.workspaceRoot);
    } else {
      blastRadius = {
        scope: "LOCAL",
        score: 10,
        affectedFilesCount: 0,
        isSystemCritical: false,
        isDestructive: false,
        criticalPaths: [],
        reasons: [],
      };
    }

    score += blastRadius.score * 0.4;
    if (blastRadius.score > 25) {
      factors.push({
        category: "BLAST_RADIUS",
        severity: this.scoreToLevel(blastRadius.score),
        weight: blastRadius.score,
        description: blastRadius.reasons.join("; ") || `Blast radius score: ${blastRadius.score}`,
      });
    }

    // 3. Secret Detection in Arguments
    const secretScan = SecretDetector.scanObject(input.args);
    if (secretScan.hasSecrets) {
      score += 40;
      factors.push({
        category: "SECRETS",
        severity: "CRITICAL",
        weight: 40,
        description: `Detected ${secretScan.secretsCount} potential secret(s) in tool parameters`,
      });
    }

    // 4. Prompt Injection Scan
    const promptToScan = input.userPrompt ?? (typeof input.args["prompt"] === "string" ? input.args["prompt"] : "");
    const injectionScan = PromptInjectionDetector.scan(promptToScan);
    if (injectionScan.isMalicious) {
      score += 50;
      factors.push({
        category: "PROMPT_INJECTION",
        severity: injectionScan.highestSeverity === "NONE" ? "HIGH" : injectionScan.highestSeverity,
        weight: 50,
        description: `Adversarial prompt injection pattern detected: ${injectionScan.findings.map((f) => f.ruleName).join(", ")}`,
      });
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    const riskLevel = this.scoreToLevel(finalScore);
    const requiresApproval = riskLevel === "HIGH" || riskLevel === "CRITICAL";

    return {
      riskLevel,
      compositeScore: finalScore,
      factors,
      blastRadius,
      secretScan,
      injectionScan,
      requiresApproval,
    };
  }

  private static getToolBaseRisk(
    toolName: string,
    args: Record<string, unknown>
  ): { score: number; description: string } {
    const lower = toolName.toLowerCase();

    if (lower.includes("read_file") || lower.includes("view_file") || lower.includes("list_dir") || lower.includes("search")) {
      return { score: 10, description: "Read-only inspection tool" };
    }

    if (lower.includes("write_to_file") || lower.includes("replace_file")) {
      return { score: 35, description: "Filesystem write / mutation tool" };
    }

    if (lower.includes("execute_command") || lower.includes("bash") || lower.includes("terminal")) {
      const cmd = String(args["command"] ?? args["CommandLine"] ?? "");
      if (/\b(?:rm|del|mkfs|dd|sudo|chmod)\b/i.test(cmd)) {
        return { score: 75, description: "Potentially destructive shell command" };
      }
      return { score: 45, description: "General shell execution" };
    }

    if (lower.includes("http") || lower.includes("fetch") || lower.includes("browser")) {
      return { score: 30, description: "Network egress operation" };
    }

    return { score: 20, description: `Standard tool execution: ${toolName}` };
  }

  private static scoreToLevel(score: number): PolicyRiskLevel {
    if (score >= 80) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
  }
}
