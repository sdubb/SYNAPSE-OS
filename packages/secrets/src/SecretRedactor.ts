import { Transform, type TransformCallback } from "node:stream";

export interface RedactorRule {
  name: string;
  pattern: RegExp;
  replacement?: string;
}

const DEFAULT_REDACTION_PATTERNS: RedactorRule[] = [
  { name: "Bearer Token", pattern: /Bearer\s+([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+|[A-Za-z0-9_\-\.]{20,})/gi, replacement: "Bearer [REDACTED]" },
  { name: "OpenAI Key", pattern: /\bsk-[A-Za-z0-9-_]{20,64}\b/g, replacement: "[REDACTED_OPENAI_KEY]" },
  { name: "Anthropic Key", pattern: /\bsk-ant-[A-Za-z0-9-_]{20,64}\b/g, replacement: "[REDACTED_ANTHROPIC_KEY]" },
  { name: "AWS Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/g, replacement: "[REDACTED_AWS_KEY_ID]" },
  { name: "GitHub PAT", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/g, replacement: "[REDACTED_GITHUB_TOKEN]" },
  { name: "Private Key", pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[^-]+-----END [A-Z ]+PRIVATE KEY-----/gs, replacement: "[REDACTED_PRIVATE_KEY]" },
  { name: "Password Assignment", pattern: /(password|passwd|secret|apikey|api_key)\s*[:=]\s*["']([^"']+)["']/gi, replacement: '$1="[REDACTED]"' },
];

export class SecretRedactor {
  private knownSecretValues: Set<string> = new Set();
  private customRules: RedactorRule[] = [];

  constructor(initialSecrets?: string[]) {
    if (initialSecrets) {
      this.registerSecrets(initialSecrets);
    }
  }

  /**
   * Registers plaintext secret strings into the redactor registry.
   */
  public registerSecret(secret: string): void {
    if (secret && secret.length >= 4) {
      this.knownSecretValues.add(secret);
    }
  }

  public registerSecrets(secrets: string[]): void {
    for (const s of secrets) {
      this.registerSecret(s);
    }
  }

  public addRule(rule: RedactorRule): void {
    this.customRules.push(rule);
  }

  /**
   * Redacts all registered secrets and pattern matches from a string.
   */
  public redact(input: string): string {
    if (!input || typeof input !== "string") {
      return input;
    }

    let output = input;

    // 1. Exact known secret strings replacement
    for (const secret of this.knownSecretValues) {
      if (output.includes(secret)) {
        output = output.replaceAll(secret, "[REDACTED]");
      }
    }

    // 2. Pattern-based redactions
    for (const rule of [...DEFAULT_REDACTION_PATTERNS, ...this.customRules]) {
      output = output.replace(rule.pattern, rule.replacement ?? "[REDACTED]");
    }

    return output;
  }

  /**
   * Recursively redacts secrets in objects and JSON structures.
   */
  public redactObject<T = unknown>(obj: T): T {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
      return this.redact(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }

    if (typeof obj === "object") {
      const result: Record<string, unknown> = {};
      const sensitiveKeys = ["token", "key", "secret", "password", "auth", "jwt", "apikey"];

      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const lowerKey = k.toLowerCase();
        const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

        if (isSensitive && typeof v === "string") {
          result[k] = "[REDACTED]";
        } else {
          result[k] = this.redactObject(v);
        }
      }
      return result as T;
    }

    return obj;
  }

  /**
   * Creates a Node.js Transform stream that redacts streaming logs/output on the fly.
   */
  public createRedactionStream(): Transform {
    const redactor = this;
    return new Transform({
      transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
        const str = chunk.toString("utf8");
        const redacted = redactor.redact(str);
        callback(null, Buffer.from(redacted, "utf8"));
      },
    });
  }
}
