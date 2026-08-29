import crypto from "node:crypto";
import fs from "node:fs/promises";

export class EvidenceHasher {
  /**
   * Computes SHA-256 hex string from text, buffer, or object.
   */
  public static hash(data: string | Buffer | Record<string, unknown>): string {
    const buffer = typeof data === "string"
      ? Buffer.from(data, "utf8")
      : Buffer.isBuffer(data)
      ? data
      : Buffer.from(this.canonicalJsonStringify(data), "utf8");

    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Computes SHA-256 checksum of a file from disk.
   */
  public static async hashFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return this.hash(content);
  }

  /**
   * Canonical JSON stringifier that sorts all object keys recursively
   * to ensure deterministic hashing regardless of key insertion order.
   */
  /**
   * Canonical JSON stringifier that sorts all object keys recursively,
   * excludes undefined properties, normalizes non-finite numbers, and ensures
   * deterministic hashing regardless of key insertion order.
   */
  public static canonicalJsonStringify(obj: unknown): string {
    if (obj === null || obj === undefined) {
      return "null";
    }

    if (typeof obj === "number") {
      return Number.isFinite(obj) ? String(obj) : "null";
    }

    if (typeof obj === "boolean") {
      return obj ? "true" : "false";
    }

    if (typeof obj === "string") {
      return JSON.stringify(obj);
    }

    if (typeof obj === "bigint") {
      return JSON.stringify(obj.toString());
    }

    if (obj instanceof Date) {
      return JSON.stringify(obj.toISOString());
    }

    if (Array.isArray(obj)) {
      return `[${obj.map((item) => (item === undefined ? "null" : this.canonicalJsonStringify(item))).join(",")}]`;
    }

    if (typeof obj === "object") {
      const record = obj as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined && typeof record[key] !== "function" && typeof record[key] !== "symbol")
        .sort();

      const keyValues = keys.map((key) => {
        return `${JSON.stringify(key)}:${this.canonicalJsonStringify(record[key])}`;
      });

      return `{${keyValues.join(",")}}`;
    }

    return JSON.stringify(obj);
  }

  /**
   * Computes a binary Merkle Root with RFC 6962 Domain Separation (0x01 prefix for interior nodes).
   */
  public static computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return "0000000000000000000000000000000000000000000000000000000000000000";
    }

    if (hashes.length === 1) {
      return hashes[0]!.toLowerCase();
    }

    let currentLevel = hashes.map((h) => h.toLowerCase());

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : left;

        // Interior node domain separation: 0x01 prefix + binary left + binary right
        const leftBuf = Buffer.from(left, "hex");
        const rightBuf = Buffer.from(right, "hex");
        const prefix = Buffer.from([0x01]);

        const combined = crypto
          .createHash("sha256")
          .update(Buffer.concat([prefix, leftBuf, rightBuf]))
          .digest("hex");

        nextLevel.push(combined);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0]!;
  }

  /**
   * Computes an HMAC-SHA256 signature.
   */
  public static sign(payload: string, secretKey: string): string {
    return crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  }
}
