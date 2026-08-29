import { EventEmitter } from "node:events";
import { RiskClassifier, type ToolRiskInput, type CompositeRiskAssessment } from "./RiskClassifier.js";
import { SecretDetector, type SecretScanResult } from "./SecretDetector.js";
import { PromptInjectionDetector, type InjectionScanResult } from "./PromptInjectionDetector.js";
import { KillSwitch } from "./KillSwitch.js";

export interface SafetyEngineOptions {
  enablePromptScanner?: boolean;
  enableSecretScanner?: boolean;
  strictMode?: boolean;
}

export class SafetyEngine extends EventEmitter {
  private killSwitch: KillSwitch;
  private options: SafetyEngineOptions;

  constructor(options?: SafetyEngineOptions) {
    super();
    this.options = {
      enablePromptScanner: true,
      enableSecretScanner: true,
      strictMode: true,
      ...options,
    };
    this.killSwitch = new KillSwitch();

    // Forward kill switch events
    this.killSwitch.on("kill:level1", (e) => this.emit("safety:kill_level1", e));
    this.killSwitch.on("kill:level2", (e) => this.emit("safety:kill_level2", e));
    this.killSwitch.on("kill:level3", (e) => this.emit("safety:kill_level3", e));
  }

  /**
   * Analyzes the real-time risk profile of a proposed tool execution.
   */
  public analyzeRisk(input: ToolRiskInput): CompositeRiskAssessment {
    const assessment = RiskClassifier.classify(input);

    if (assessment.riskLevel === "CRITICAL") {
      this.emit("safety:critical_risk_detected", { input, assessment });
    }

    return assessment;
  }

  /**
   * Scans a prompt or conversation history for injection attempts.
   */
  public scanPrompt(prompt: string): InjectionScanResult {
    if (!this.options.enablePromptScanner) {
      return {
        isMalicious: false,
        confidenceScore: 0,
        highestSeverity: "NONE",
        findings: [],
      };
    }
    return PromptInjectionDetector.scan(prompt);
  }

  /**
   * Scans text or objects for secrets.
   */
  public scanSecrets(target: string | Record<string, unknown>): SecretScanResult {
    if (!this.options.enableSecretScanner) {
      return {
        hasSecrets: false,
        secretsCount: 0,
        detectedSecrets: [],
        highestEntropy: 0,
      };
    }
    return typeof target === "string"
      ? SecretDetector.scanText(target)
      : SecretDetector.scanObject(target);
  }

  /**
   * Returns the multi-level KillSwitch instance.
   */
  public getKillSwitch(): KillSwitch {
    return this.killSwitch;
  }
}
