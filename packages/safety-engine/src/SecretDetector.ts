export interface DetectedSecret {
  type: string;
  matchedString: string;
  entropy: number;
  line?: number;
  startIndex: number;
  endIndex: number;
  redactedPreview: string;
}

export interface SecretScanResult {
  hasSecrets: boolean;
  secretsCount: number;
  detectedSecrets: DetectedSecret[];
  highestEntropy: number;
}

interface SecretPatternRule {
  type: string;
  pattern: RegExp;
  minEntropy?: number;
}

const KNOWN_SECRET_PATTERNS: SecretPatternRule[] = [
  { type: "OpenAI API Key", pattern: /\bsk-[A-Za-z0-9-_]{20,64}\b/g, minEntropy: 3.5 },
  { type: "Anthropic API Key", pattern: /\bsk-ant-[A-Za-z0-9-_]{20,64}\b/g, minEntropy: 3.5 },
  { type: "AWS Access Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "AWS Secret Access Key", pattern: /\b[A-Za-z0-9/+=]{40}\b/g, minEntropy: 4.5 },
  { type: "GitHub Personal Access Token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/g },
  { type: "GitHub Fine-Grained Token", pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g },
  { type: "Google API Key", pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g },
  { type: "Slack Token", pattern: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g },
  { type: "Stripe API Key", pattern: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99}\b/g },
  { type: "Private Key Header", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { type: "JWT Token", pattern: /\beyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+\b/g, minEntropy: 3.8 },
  { type: "Generic Password In Assignment", pattern: /(?:password|passwd|secret|api_key|token)\s*[:=]\s*["']([^"'\s]{8,})["']/gi, minEntropy: 3.0 },
];

export class SecretDetector {
  /**
   * Computes the Shannon entropy (bits per character) of a string.
   * High entropy (> 4.2) strongly correlates with cryptographically random tokens and keys.
   */
  public static calculateShannonEntropy(str: string): number {
    if (!str || str.length === 0) return 0;
    const frequencies = new Map<string, number>();

    for (const char of str) {
      frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
    }

    let entropy = 0;
    const len = str.length;

    for (const count of frequencies.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Scans a text string for known credentials, private keys, and high-entropy secrets.
   */
  public static scanText(text: string, entropyThreshold = 4.2): SecretScanResult {
    if (!text || typeof text !== "string") {
      return {
        hasSecrets: false,
        secretsCount: 0,
        detectedSecrets: [],
        highestEntropy: 0,
      };
    }

    const detected: DetectedSecret[] = [];
    let maxEntropy = 0;

    // 1. Pattern-based detection
    for (const rule of KNOWN_SECRET_PATTERNS) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(text)) !== null) {
        const fullMatch = match[0] ?? "";
        if (!fullMatch) continue;

        const entropy = this.calculateShannonEntropy(fullMatch);
        if (entropy > maxEntropy) maxEntropy = entropy;

        if (rule.minEntropy && entropy < rule.minEntropy) {
          continue; // Skip false positive low-entropy matches
        }

        detected.push({
          type: rule.type,
          matchedString: fullMatch,
          entropy,
          startIndex: match.index,
          endIndex: match.index + fullMatch.length,
          redactedPreview: this.redactPreview(fullMatch),
        });
      }
    }

    // 2. High-entropy token scanner on long alphanumeric words
    const tokenRegex = /\b[A-Za-z0-9_\-+/=]{20,}\b/g;
    let tokenMatch: RegExpExecArray | null;

    while ((tokenMatch = tokenRegex.exec(text)) !== null) {
      const candidate = tokenMatch[0];
      if (!candidate) continue;
      const entropy = this.calculateShannonEntropy(candidate);
      if (entropy > maxEntropy) maxEntropy = entropy;

      // Check if already captured by regex patterns
      const alreadyCaptured = detected.some(
        (d) => tokenMatch && d.startIndex <= tokenMatch.index && d.endIndex >= tokenMatch.index + candidate.length
      );

      if (!alreadyCaptured && entropy >= entropyThreshold) {
        detected.push({
          type: "High Entropy Token",
          matchedString: candidate,
          entropy,
          startIndex: tokenMatch.index,
          endIndex: tokenMatch.index + candidate.length,
          redactedPreview: this.redactPreview(candidate),
        });
      }
    }

    return {
      hasSecrets: detected.length > 0,
      secretsCount: detected.length,
      detectedSecrets: detected,
      highestEntropy: maxEntropy,
    };
  }

  /**
   * Recursively scans an object for secrets.
   */
  public static scanObject(obj: unknown, entropyThreshold = 4.2): SecretScanResult {
    const stringified = typeof obj === "string" ? obj : JSON.stringify(obj);
    return this.scanText(stringified, entropyThreshold);
  }

  private static redactPreview(str: string): string {
    if (str.length <= 8) return "[REDACTED]";
    return `${str.slice(0, 3)}...${str.slice(-3)}`;
  }
}
