import crypto from "node:crypto";
import { type UserRole, type PermissionAction } from "@synapse/contracts";

export interface ApiKeyMetadata {
  id: string;
  tenantId: string;
  keyPrefix: string; // e.g., "syn_live_a1b2"
  hashedKey: string; // SHA-256 of the raw token
  name: string;
  role: UserRole;
  permissions: PermissionAction[];
  revoked: boolean;
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface GeneratedApiKey {
  rawKey: string; // The secret key shown only once to user
  metadata: ApiKeyMetadata;
}

export class ApiKeyService {
  private keys: Map<string, ApiKeyMetadata> = new Map(); // key = hashedKey

  /**
   * Generates a new cryptographically secure API key.
   */
  public generateKey(options: {
    tenantId: string;
    name: string;
    role?: UserRole;
    permissions?: PermissionAction[];
    expiresInDays?: number;
    prefix?: "live" | "test";
  }): GeneratedApiKey {
    const envPrefix = options.prefix ?? "live";
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawKey = `syn_${envPrefix}_${randomBytes}`;
    const keyPrefix = rawKey.slice(0, 16);
    const hashedKey = this.hashKey(rawKey);

    const now = new Date();
    const expiresAt = options.expiresInDays
      ? new Date(now.getTime() + options.expiresInDays * 86400 * 1000).toISOString()
      : undefined;

    const metadata: ApiKeyMetadata = {
      id: crypto.randomUUID(),
      tenantId: options.tenantId,
      keyPrefix,
      hashedKey,
      name: options.name,
      role: options.role ?? "developer",
      permissions: options.permissions ?? [],
      revoked: false,
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.keys.set(hashedKey, metadata);

    return {
      rawKey,
      metadata,
    };
  }

  /**
   * Validates a raw API key using constant-time hash comparison.
   */
  public validateKey(rawKey: string): ApiKeyMetadata | null {
    if (!rawKey || !rawKey.startsWith("syn_")) {
      return null;
    }

    const hashedInput = this.hashKey(rawKey);
    const stored = this.keys.get(hashedInput);

    if (!stored) {
      return null;
    }

    if (stored.revoked) {
      return null;
    }

    if (stored.expiresAt && new Date() > new Date(stored.expiresAt)) {
      return null;
    }

    // Update last used timestamp
    stored.lastUsedAt = new Date().toISOString();
    return { ...stored };
  }

  /**
   * Revokes an API key by ID or prefix.
   */
  public revokeKey(keyId: string): boolean {
    for (const key of this.keys.values()) {
      if (key.id === keyId) {
        key.revoked = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Lists active keys for a tenant.
   */
  public listKeys(tenantId: string): ApiKeyMetadata[] {
    const list: ApiKeyMetadata[] = [];
    for (const key of this.keys.values()) {
      if (key.tenantId === tenantId) {
        list.push({ ...key });
      }
    }
    return list;
  }

  private hashKey(rawKey: string): string {
    return crypto.createHash("sha256").update(rawKey).digest("hex");
  }
}
