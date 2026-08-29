import { EventEmitter } from "node:events";
import { RiskClassifier } from "./RiskClassifier.js";
import { SecretDetector } from "./SecretDetector.js";
import { PromptInjectionDetector } from "./PromptInjectionDetector.js";
import { KillSwitch } from "./KillSwitch.js";
export class SafetyEngine extends EventEmitter {
    killSwitch;
    options;
    constructor(options) {
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
    analyzeRisk(input) {
        const assessment = RiskClassifier.classify(input);
        if (assessment.riskLevel === "CRITICAL") {
            this.emit("safety:critical_risk_detected", { input, assessment });
        }
        return assessment;
    }
    /**
     * Scans a prompt or conversation history for injection attempts.
     */
    scanPrompt(prompt) {
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
    scanSecrets(target) {
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
    getKillSwitch() {
        return this.killSwitch;
    }
}
//# sourceMappingURL=SafetyEngine.js.map