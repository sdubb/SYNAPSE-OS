import { EventEmitter } from "node:events";
import { type ToolRiskInput, type CompositeRiskAssessment } from "./RiskClassifier.js";
import { type SecretScanResult } from "./SecretDetector.js";
import { type InjectionScanResult } from "./PromptInjectionDetector.js";
import { KillSwitch } from "./KillSwitch.js";
export interface SafetyEngineOptions {
    enablePromptScanner?: boolean;
    enableSecretScanner?: boolean;
    strictMode?: boolean;
}
export declare class SafetyEngine extends EventEmitter {
    private killSwitch;
    private options;
    constructor(options?: SafetyEngineOptions);
    /**
     * Analyzes the real-time risk profile of a proposed tool execution.
     */
    analyzeRisk(input: ToolRiskInput): CompositeRiskAssessment;
    /**
     * Scans a prompt or conversation history for injection attempts.
     */
    scanPrompt(prompt: string): InjectionScanResult;
    /**
     * Scans text or objects for secrets.
     */
    scanSecrets(target: string | Record<string, unknown>): SecretScanResult;
    /**
     * Returns the multi-level KillSwitch instance.
     */
    getKillSwitch(): KillSwitch;
}
//# sourceMappingURL=SafetyEngine.d.ts.map