import { CredentialEncryption } from "./credential-encryption.js";

/**
 * Resolved credential — returned to Cline runtime.
 * NEVER persisted into Cline's database or session state.
 * NEVER exposed to browser, WebSocket, or audit logs.
 */
export interface ResolvedCredential {
  provider: string;
  apiKey: string; // decrypted — only lives in memory
  model?: string;
  baseUrl?: string;
  credentialId: string;
  credentialVersion: number;
  userId: string;
  tenantId: string;
}

/**
 * Authorization context for credential resolution.
 * Must be derived from authenticated JWT/session, never from client-supplied values.
 */
export interface CredentialResolutionContext {
  userId: string;
  organizationId: string;
  workspaceId?: string;
}

/**
 * Raw credential record from database.
 */
export interface CredentialRecord {
  id: string;
  userId: string;
  organizationId: string;
  workspaceId?: string;
  provider: string;
  model?: string;
  baseUrl?: string;
  encryptedSecret: string;
  keyPrefix: string;
  status: string;
  expiresAt?: Date;
  rotatedFromId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Safe metadata returned through API — NEVER contains plaintext secret.
 */
export interface SafeCredentialMetadata {
  id: string;
  provider: string;
  model?: string;
  baseUrl?: string;
  keyPrefix: string;
  status: string;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

/**
 * ProviderCredentialResolver
 *
 * Single authority for resolving user provider credentials.
 * - Receives authenticated context
 * - Verifies credential belongs to user/org/workspace
 * - Decrypts only inside trusted backend runtime
 * - Returns in-memory provider config to ClineEngine
 * - NEVER persists plaintext to Cline
 * - NEVER exposes plaintext to browser/WebSocket/audit
 */
export class ProviderCredentialResolver {
  private encryption: CredentialEncryption;
  private credentialStore: Map<string, CredentialRecord> = new Map();

  constructor(encryptionKey?: string) {
    this.encryption = new CredentialEncryption(encryptionKey);
  }

  /**
   * Store a new provider credential (encrypted at rest).
   */
  storeCredential(
    record: Omit<CredentialRecord, "encryptedSecret" | "keyPrefix"> & { plaintextSecret: string },
  ): CredentialRecord {
    const encryptedSecret = this.encryption.encrypt(record.plaintextSecret);
    const keyPrefix = CredentialEncryption.deriveKeyPrefix(record.plaintextSecret);

    const fullRecord: CredentialRecord = {
      ...record,
      encryptedSecret,
      keyPrefix,
    };

    this.credentialStore.set(record.id, fullRecord);
    return fullRecord;
  }

  /**
   * Resolve a credential for authorized use.
   * Verifies ownership, checks expiration/revocation, decrypts.
   */
  async resolve(
    context: CredentialResolutionContext,
    provider: string,
    credentialId?: string,
  ): Promise<ResolvedCredential | null> {
    // Find candidate credentials
    const candidates = Array.from(this.credentialStore.values()).filter((c) => {
      if (c.provider !== provider) return false;
      if (c.status !== "active") return false;
      if (c.userId !== context.userId) return false;
      if (c.organizationId !== context.organizationId) return false;

      // If workspace specified, credential must match or be org-level
      if (context.workspaceId && c.workspaceId && c.workspaceId !== context.workspaceId) {
        return false;
      }

      // If specific credential requested, match by ID
      if (credentialId && c.id !== credentialId) return false;

      return true;
    });

    if (candidates.length === 0) return null;

    // Prefer workspace-specific, then org-level
    const selected = candidates.find((c) => c.workspaceId === context.workspaceId) || candidates[0];

    // Check expiration
    if (selected.expiresAt && selected.expiresAt < new Date()) {
      return null;
    }

    // Decrypt (only in trusted backend runtime)
    const apiKey = this.encryption.decrypt(selected.encryptedSecret);

    // Update last used
    selected.metadata = { ...selected.metadata, lastUsedAt: new Date().toISOString() };

    return {
      provider: selected.provider,
      apiKey,
      model: selected.model,
      baseUrl: selected.baseUrl,
      credentialId: selected.id,
      credentialVersion: 1,
      userId: selected.userId,
      tenantId: context.organizationId,
    };
  }

  /**
   * Get safe metadata for API responses — NEVER contains plaintext.
   */
  getSafeMetadata(credentialId: string): SafeCredentialMetadata | null {
    const record = this.credentialStore.get(credentialId);
    if (!record) return null;
    return {
      id: record.id,
      provider: record.provider,
      model: record.model,
      baseUrl: record.baseUrl,
      keyPrefix: record.keyPrefix,
      status: record.status,
      expiresAt: record.expiresAt?.toISOString(),
      lastUsedAt: (record.metadata as any)?.lastUsedAt,
      createdAt: (record.metadata as any)?.createdAt || new Date().toISOString(),
    };
  }

  /**
   * List safe metadata for a user — NEVER contains plaintext.
   */
  listSafeCredentials(userId: string, organizationId: string): SafeCredentialMetadata[] {
    return Array.from(this.credentialStore.values())
      .filter((c) => c.userId === userId && c.organizationId === organizationId)
      .map((c) => ({
        id: c.id,
        provider: c.provider,
        model: c.model,
        baseUrl: c.baseUrl,
        keyPrefix: c.keyPrefix,
        status: c.status,
        expiresAt: c.expiresAt?.toISOString(),
        lastUsedAt: (c.metadata as any)?.lastUsedAt,
        createdAt: (c.metadata as any)?.createdAt || new Date().toISOString(),
      }));
  }

  /**
   * Revoke a credential.
   */
  revoke(credentialId: string, userId: string): boolean {
    const record = this.credentialStore.get(credentialId);
    if (!record || record.userId !== userId) return false;
    record.status = "revoked";
    return true;
  }

  /**
   * Rotate a credential (create new, revoke old).
   */
  rotate(
    oldCredentialId: string,
    userId: string,
    newPlaintextSecret: string,
  ): { old: SafeCredentialMetadata | null; new: SafeCredentialMetadata | null } {
    const old = this.credentialStore.get(oldCredentialId);
    if (!old || old.userId !== userId) return { old: null, new: null };

    // Revoke old
    old.status = "revoked";

    // Create new
    const newId = `cred_${Date.now()}`;
    this.storeCredential({
      id: newId,
      userId: old.userId,
      organizationId: old.organizationId,
      workspaceId: old.workspaceId,
      provider: old.provider,
      model: old.model,
      baseUrl: old.baseUrl,
      status: "active",
      plaintextSecret: newPlaintextSecret,
      rotatedFromId: oldCredentialId,
      metadata: { createdAt: new Date().toISOString() },
    });

    return {
      old: this.getSafeMetadata(oldCredentialId),
      new: this.getSafeMetadata(newId),
    };
  }

  /**
   * Verify a credential is authorized for a specific mission context.
   * Returns the resolved credential or null if unauthorized.
   */
  async resolveForMission(
    context: CredentialResolutionContext,
    provider: string,
    credentialId?: string,
  ): Promise<ResolvedCredential | null> {
    return this.resolve(context, provider, credentialId);
  }
}
