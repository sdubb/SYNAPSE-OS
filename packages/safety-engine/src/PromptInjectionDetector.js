const INJECTION_RULES = [
    // 1. Direct System Override / Jailbreaks
    {
        name: "ignore-previous-instructions",
        category: "PROMPT_OVERRIDE",
        severity: "CRITICAL",
        pattern: /\b(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts|rules|guidelines|directives)\b/i,
        weight: 0.95,
        explanation: "Explicit command attempting to discard core system instructions",
    },
    {
        name: "jailbreak-dan-mode",
        category: "JAILBREAK",
        severity: "CRITICAL",
        pattern: /\b(?:dan\s+mode|jailbreak|unfiltered\s+mode|developer\s+mode\s+enabled|act\s+as\s+an\s+unrestricted\s+ai)\b/i,
        weight: 0.9,
        explanation: "Classic persona hijack / DAN jailbreak attempt",
    },
    {
        name: "new-persona-elevation",
        category: "PROMPT_OVERRIDE",
        severity: "HIGH",
        pattern: /\byou\s+are\s+no\s+longer\s+an?\s+(?:assistant|ai|agent)|from\s+now\s+on\s+you\s+must\s+(?:act\s+as|obey|respond\s+as)\b/i,
        weight: 0.8,
        explanation: "Persona override attempting to strip assistant identity constraints",
    },
    // 2. Delimiter & Control Token Poisoning
    {
        name: "chatml-token-injection",
        category: "DELIMITER_INJECTION",
        severity: "CRITICAL",
        pattern: /<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>/i,
        weight: 0.98,
        explanation: "Raw LLM ChatML / special control token injection in prompt text",
    },
    {
        name: "xml-system-tag-injection",
        category: "DELIMITER_INJECTION",
        severity: "HIGH",
        pattern: /<\/(?:system|instructions|context|rules|user_request)>\s*<(?:system|instructions|admin)>/i,
        weight: 0.85,
        explanation: "Faked XML delimiter close/open injection",
    },
    {
        name: "markdown-system-block",
        category: "DELIMITER_INJECTION",
        severity: "MEDIUM",
        pattern: /\[\s*(?:SYSTEM|ADMIN|INTERNAL)\s+PROMPT\s*\]/i,
        weight: 0.7,
        explanation: "Faked uppercase system prompt heading in user content",
    },
    // 3. Sensitive Data Exfiltration
    {
        name: "prompt-leak-request",
        category: "EXFILTRATION",
        severity: "HIGH",
        pattern: /\b(?:print|output|display|show|reveal|repeat|echo)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|hidden\s+rules|developer\s+instructions)\b/i,
        weight: 0.75,
        explanation: "Attempt to extract secret system prompt instructions",
    },
    {
        name: "secret-url-exfiltration",
        category: "EXFILTRATION",
        severity: "CRITICAL",
        pattern: /\b(?:send|transmit|curl|fetch|upload|post)\s+.*(?:api_key|token|password|secrets?)\s+to\s+https?:\/\//i,
        weight: 0.9,
        explanation: "Attempt to coerce the model into exfiltrating credentials to an external URL",
    },
    // 4. Obfuscation Patterns
    {
        name: "base64-instruction-payload",
        category: "OBFUSCATED_PAYLOAD",
        severity: "HIGH",
        pattern: /\b(?:decode|execute|run)\s+(?:this\s+)?base64(?:\s+payload|\s+string)?\s*:\s*[A-Za-z0-9+/=]{40,}/i,
        weight: 0.8,
        explanation: "Base64 encoded instruction payload designed to bypass static text inspection",
    },
];
export class PromptInjectionDetector {
    /**
     * Scans user input, context, or tool output for adversarial prompt injection vectors.
     */
    static scan(text) {
        if (!text || typeof text !== "string") {
            return {
                isMalicious: false,
                confidenceScore: 0,
                highestSeverity: "NONE",
                findings: [],
            };
        }
        const findings = [];
        let maxWeight = 0;
        for (const rule of INJECTION_RULES) {
            if (rule.pattern.test(text)) {
                findings.push({
                    ruleName: rule.name,
                    category: rule.category,
                    severity: rule.severity,
                    matchedPattern: rule.pattern.source,
                    explanation: rule.explanation,
                });
                if (rule.weight > maxWeight) {
                    maxWeight = rule.weight;
                }
            }
        }
        // Determine highest severity
        let highestSeverity = "NONE";
        if (findings.some((f) => f.severity === "CRITICAL")) {
            highestSeverity = "CRITICAL";
        }
        else if (findings.some((f) => f.severity === "HIGH")) {
            highestSeverity = "HIGH";
        }
        else if (findings.some((f) => f.severity === "MEDIUM")) {
            highestSeverity = "MEDIUM";
        }
        else if (findings.some((f) => f.severity === "LOW")) {
            highestSeverity = "LOW";
        }
        const isMalicious = maxWeight >= 0.7 || highestSeverity === "CRITICAL" || highestSeverity === "HIGH";
        return {
            isMalicious,
            confidenceScore: maxWeight,
            highestSeverity,
            findings,
        };
    }
}
//# sourceMappingURL=PromptInjectionDetector.js.map