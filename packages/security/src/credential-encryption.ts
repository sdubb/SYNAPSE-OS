import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for provider credentials at rest.
 *
 * Key derivation: PBKDF2 from master key + random salt.
 * Each credential gets a unique salt + IV.
 * Format: salt:iv:authTag:ciphertext (all base64)
 */
export class CredentialEncryption {
  private masterKey: Buffer;

  constructor(masterKey?: string) {
    const key =
      masterKey || process.env.SYNAPSE_CREDENTIAL_ENCRYPTION_KEY || "synapse-dev-credential-encryption-key-change-me";
    this.masterKey = Buffer.from(key, "utf-8");
  }

  /**
   * Encrypt a plaintext credential.
   * Returns a string: salt:iv:authTag:ciphertext (base64 encoded components)
   */
  encrypt(plaintext: string): string {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    const derived = crypto.pbkdf2Sync(this.masterKey, salt, 100000, 32, "sha256");
    const cipher = crypto.createCipheriv("aes-256-gcm", derived, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf-8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      salt.toString("base64"),
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  }

  /**
   * Decrypt an encrypted credential back to plaintext.
   * Only called inside the trusted backend runtime.
   */
  decrypt(encryptedPayload: string): string {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted credential format");
    }

    const [saltB64, ivB64, authTagB64, ciphertextB64] = parts;
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const derived = crypto.pbkdf2Sync(this.masterKey, salt, 100000, 32, "sha256");
    const decipher = crypto.createDecipheriv("aes-256-gcm", derived, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  }

  /**
   * Generate a safe key prefix for display (never the full key).
   * Example: "sk-or-v1-••••••••7bf0"
   */
  static deriveKeyPrefix(apiKey: string): string {
    if (!apiKey || apiKey.length < 12) return "••••••••";
    const visible = apiKey.slice(0, 8);
    const suffix = apiKey.slice(-4);
    const masked = "•".repeat(Math.min(apiKey.length - 12, 12));
    return `${visible}${masked}${suffix}`;
  }
}
