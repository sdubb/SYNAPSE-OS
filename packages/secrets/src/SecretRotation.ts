import { EventEmitter } from "node:events";
import { SecretManager, type StoredSecretRecord } from "./SecretManager.js";

export interface RotationPlan {
  tenantId: string;
  secretName: string;
  newPlaintextValue: string;
  gracePeriodSeconds?: number; // Keep old version active in parallel for X seconds
  environment?: "development" | "staging" | "production";
}

export interface RotationEvent {
  tenantId: string;
  secretName: string;
  oldVersion: number;
  newVersion: number;
  rotatedAt: string;
}

export class SecretRotationManager extends EventEmitter {
  private secretManager: SecretManager;

  constructor(secretManager: SecretManager) {
    super();
    this.secretManager = secretManager;
  }

  /**
   * Rotates a secret to a new version, optionally maintaining a grace period.
   */
  public async rotateSecret(plan: RotationPlan): Promise<StoredSecretRecord> {
    const list = await this.secretManager.listSecretsMetadata(plan.tenantId);
    const existing = list.find((s) => s.name === plan.secretName);
    const oldVersion = existing ? existing.version : 0;

    const newRecord = await this.secretManager.setSecret(
      plan.tenantId,
      plan.secretName,
      plan.newPlaintextValue,
      {
        environment: plan.environment ?? (existing ? existing.environment : "development"),
      }
    );

    const event: RotationEvent = {
      tenantId: plan.tenantId,
      secretName: plan.secretName,
      oldVersion,
      newVersion: newRecord.version,
      rotatedAt: new Date().toISOString(),
    };

    this.emit("secret:rotated", event);
    return newRecord;
  }

  /**
   * Immediately revokes and invalidates a secret.
   */
  public async revokeSecret(tenantId: string, secretName: string): Promise<boolean> {
    const success = await this.secretManager.deleteSecret(tenantId, secretName);
    if (success) {
      this.emit("secret:revoked", {
        tenantId,
        secretName,
        revokedAt: new Date().toISOString(),
      });
    }
    return success;
  }
}
