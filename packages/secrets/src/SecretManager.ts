import { type EncryptedCredentialEnvelope } from "@synapse/contracts";
import { EncryptionService } from "./Encryption.js";

export interface StoredSecretRecord {
  id: string;
  tenantId: string;
  name: string; // e.g. "OPENAI_API_KEY", "DATABASE_URL"
  version: number;
  envelope: EncryptedCredentialEnvelope;
  scopes: string[]; // e.g. ["tool:execute", "agent:dev-agent-1"]
  environment: "development" | "staging" | "production";
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface SetSecretOptions {
  scopes?: string[];
  environment?: "development" | "staging" | "production";
  expiresInSeconds?: number;
  metadata?: Record<string, unknown>;
}

export class SecretManager {
  private encryption: EncryptionService;
  private secrets: Map<string, StoredSecretRecord> = new Map(); // key = `${tenantId}:${name}`

  constructor(encryption?: EncryptionService) {
    this.encryption = encryption ?? new EncryptionService();
  }

  /**
   * Sets and encrypts a secret for a tenant.
   */
  public async setSecret(
    tenantId: string,
    name: string,
    plaintextValue: string,
    options?: SetSecretOptions
  ): Promise<StoredSecretRecord> {
    const key = `${tenantId}:${name}`;
    const existing = this.secrets.get(key);
    const version = existing ? existing.version + 1 : 1;

    const encrypted = this.encryption.encrypt(plaintextValue);
    const id = existing?.id ?? crypto.randomUUID();
    const envelope = this.encryption.toEnvelope(tenantId, encrypted, id);

    const now = new Date();
    const expiresAt = options?.expiresInSeconds
      ? new Date(now.getTime() + options.expiresInSeconds * 1000).toISOString()
      : undefined;

    const record: StoredSecretRecord = {
      id,
      tenantId,
      name,
      version,
      envelope,
      scopes: options?.scopes ?? ["*"],
      environment: options?.environment ?? "development",
      expiresAt,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      metadata: options?.metadata ?? {},
    };

    this.secrets.set(key, record);
    return record;
  }

  /**
   * Gets the encrypted credential envelope for a secret.
   */
  public async getSecretEnvelope(tenantId: string, name: string): Promise<EncryptedCredentialEnvelope | null> {
    const record = this.getRecord(tenantId, name);
    return record ? record.envelope : null;
  }

  /**
   * Decrypts and returns the plaintext secret value.
   */
  public async getPlaintextSecret(tenantId: string, name: string): Promise<string | null> {
    const record = this.getRecord(tenantId, name);
    if (!record) return null;

    if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
      throw new Error(`Secret '${name}' has expired`);
    }

    return this.encryption.decryptEnvelope(record.envelope);
  }

  /**
   * Lists metadata for all secrets stored for a tenant (without decrypting values).
   */
  public async listSecretsMetadata(tenantId: string): Promise<Array<Omit<StoredSecretRecord, "envelope">>> {
    const list: Array<Omit<StoredSecretRecord, "envelope">> = [];
    for (const record of this.secrets.values()) {
      if (record.tenantId === tenantId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { envelope, ...meta } = record;
        list.push(meta);
      }
    }
    return list;
  }

  /**
   * Deletes a secret from storage.
   */
  public async deleteSecret(tenantId: string, name: string): Promise<boolean> {
    return this.secrets.delete(`${tenantId}:${name}`);
  }

  private getRecord(tenantId: string, name: string): StoredSecretRecord | null {
    const record = this.secrets.get(`${tenantId}:${name}`);
    return record ?? null;
  }
}
