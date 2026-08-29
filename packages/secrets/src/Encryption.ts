import crypto from "node:crypto";
import { type EncryptedCredentialEnvelope } from "@synapse/contracts";

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
  salt: string; // Base64
  keyId: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH_BYTES = 16;
  private static readonly SALT_LENGTH_BYTES = 32;
  private static readonly KEY_LENGTH_BYTES = 32; // 256 bits
  private static readonly PBKDF2_ITERATIONS = 100_000;
  private static readonly DIGEST = "sha512";

  private masterKey: Buffer;
  private defaultKeyId: string;

  constructor(masterSecret?: string, keyId = "synapse-master-v1") {
    const rawSecret = masterSecret ?? process.env["SYNAPSE_MASTER_KEY"] ?? "synapse-default-secure-master-key-32bytes!";
    this.masterKey = Buffer.from(rawSecret, "utf-8");
    this.defaultKeyId = keyId;
  }

  /**
   * Derives a 256-bit symmetric encryption key using PBKDF2 with SHA-512.
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      EncryptionService.PBKDF2_ITERATIONS,
      EncryptionService.KEY_LENGTH_BYTES,
      EncryptionService.DIGEST
    );
  }

  /**
   * Encrypts plaintext string with AES-256-GCM authenticated encryption.
   */
  public encrypt(plaintext: string, keyId = this.defaultKeyId): EncryptedPayload {
    const salt = crypto.randomBytes(EncryptionService.SALT_LENGTH_BYTES);
    const iv = crypto.randomBytes(EncryptionService.IV_LENGTH_BYTES);
    const key = this.deriveKey(salt);

    const cipher = crypto.createCipheriv(EncryptionService.ALGORITHM, key, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      salt: salt.toString("base64"),
      keyId,
    };
  }

  /**
   * Decrypts an AES-256-GCM ciphertext payload.
   */
  public decrypt(payload: EncryptedPayload): string {
    const salt = Buffer.from(payload.salt, "base64");
    const iv = Buffer.from(payload.iv, "base64");
    const authTag = Buffer.from(payload.authTag, "base64");
    const key = this.deriveKey(salt);

    const decipher = crypto.createDecipheriv(EncryptionService.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(payload.ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");
    return plaintext;
  }

  /**
   * Converts EncryptedPayload to the standard @synapse/contracts EncryptedCredentialEnvelope.
   */
  public toEnvelope(tenantId: string, payload: EncryptedPayload, id: string = crypto.randomUUID()): EncryptedCredentialEnvelope {
    return {
      id: id as `${string}-${string}-${string}-${string}-${string}`,
      tenantId: tenantId as `${string}-${string}-${string}-${string}-${string}`,
      keyId: payload.keyId,
      algorithm: "aes-256-gcm",
      ciphertext: `${payload.salt}$${payload.ciphertext}`, // Package salt with ciphertext
      iv: payload.iv,
      authTag: payload.authTag,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Decrypts from standard @synapse/contracts EncryptedCredentialEnvelope.
   */
  public decryptEnvelope(envelope: EncryptedCredentialEnvelope): string {
    const [salt, ciphertext] = envelope.ciphertext.split("$");
    if (!salt || !ciphertext) {
      throw new Error("Invalid encrypted credential envelope ciphertext format");
    }

    return this.decrypt({
      ciphertext,
      salt,
      iv: envelope.iv,
      authTag: envelope.authTag,
      keyId: envelope.keyId,
    });
  }
}
