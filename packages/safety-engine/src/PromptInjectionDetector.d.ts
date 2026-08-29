export interface InjectionFinding {
    ruleName: string;
    category: "JAILBREAK" | "PROMPT_OVERRIDE" | "DELIMITER_INJECTION" | "EXFILTRATION" | "OBFUSCATED_PAYLOAD";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    matchedPattern: string;
    explanation: string;
}
export interface InjectionScanResult {
    isMalicious: boolean;
    confidenceScore: number;
    highestSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    findings: InjectionFinding[];
}
export declare class PromptInjectionDetector {
    /**
     * Scans user input, context, or tool output for adversarial prompt injection vectors.
     */
    static scan(text: string): InjectionScanResult;
}
//# sourceMappingURL=PromptInjectionDetector.d.ts.map