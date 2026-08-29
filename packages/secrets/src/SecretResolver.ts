import { SecretManager } from "./SecretManager.js";
import { SecretRedactor } from "./SecretRedactor.js";

export interface ResolveSecretOptions {
  callerAgentId?: string;
  callerToolName?: string;
  environment?: "development" | "staging" | "production";
}

export class SecretResolver {
  private secretManager: SecretManager;
  private redactor: SecretRedactor;

  constructor(secretManager?: SecretManager, redactor?: SecretRedactor) {
    this.secretManager = secretManager ?? new SecretManager();
    this.redactor = redactor ?? new SecretRedactor();
  }

  /**
   * Resolves a set of named secrets for a tenant at the execution boundary.
   * Auto-registers all decrypted plaintext values with the SecretRedactor so they are
   * never leaked into logs, transcripts, or events.
   */
  public async resolveSecrets(
    tenantId: string,
    secretNames: string[],
    _options?: ResolveSecretOptions
  ): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};

    for (const name of secretNames) {
      const value = await this.secretManager.getPlaintextSecret(tenantId, name);
      if (value !== null) {
        resolved[name] = value;
        this.redactor.registerSecret(value);
      }
    }

    return resolved;
  }

  /**
   * Replaces placeholders like `{{secret:OPENAI_API_KEY}}` inside a target string
   * with real secret values at the execution boundary.
   */
  public async interpolateSecrets(
    tenantId: string,
    template: string,
    options?: ResolveSecretOptions
  ): Promise<string> {
    const placeholderRegex = /\{\{secret:([A-Za-z0-9_]+)\}\}/g;
    const matches = Array.from(template.matchAll(placeholderRegex));

    if (matches.length === 0) {
      return template;
    }

    const secretNames = matches.map((m) => m[1]).filter((name): name is string => Boolean(name));
    const resolved = await this.resolveSecrets(tenantId, secretNames, options);

    let result = template;
    for (const [name, val] of Object.entries(resolved)) {
      result = result.replaceAll(`{{secret:${name}}}`, val);
    }

    return result;
  }

  /**
   * Returns the redactor instance associated with this resolver.
   */
  public getRedactor(): SecretRedactor {
    return this.redactor;
  }
}
