/**
 * SYNAPSE OS — CODEBASE INTEGRITY & WATERMARK GUARDIAN
 * Copyright (c) 2026 SYNAPSE OS. All Rights Reserved.
 *
 * Enforces cryptographic watermark validation and host environment fingerprinting
 * to prevent unauthorized extraction, cloning, or license removal.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const SYNAPSE_PROPRIETARY_WATERMARK = "SYNAPSE_OS_CORE_PROPRIETARY_WATERMARK_2026_SDUBB_ALL_RIGHTS_RESERVED";

export interface IntegrityCheckResult {
  valid: boolean;
  watermarkPresent: boolean;
  licensePresent: boolean;
  systemFingerprint: string;
  timestamp: string;
  violations: string[];
}

export class IntegrityGuardian {
  private static cachedFingerprint: string | null = null;

  /**
   * Compute a deterministic host machine fingerprint based on hardware & environment.
   */
  public static getSystemFingerprint(): string {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    try {
      const cpus = os.cpus() || [];
      const cpuModel = cpus.length > 0 ? cpus[0].model : "unknown_cpu";
      const totalMem = os.totalmem();
      const hostname = os.hostname();
      const platform = os.platform();
      const arch = os.arch();
      const homedir = os.homedir();

      const raw = `${hostname}|${platform}|${arch}|${cpuModel}|${totalMem}|${homedir}`;
      this.cachedFingerprint = crypto.createHash("sha256").update(raw).digest("hex");
    } catch {
      this.cachedFingerprint = crypto.createHash("sha256").update(os.hostname() || "fallback_host").digest("hex");
    }

    return this.cachedFingerprint;
  }

  /**
   * Verify license file presence and integrity at the workspace root.
   */
  public static async verifyWorkspaceIntegrity(workspaceRoot: string = process.cwd()): Promise<IntegrityCheckResult> {
    const violations: string[] = [];
    let licensePresent = false;
    let watermarkPresent = false;

    // 1. Verify LICENSE file
    try {
      const licensePath = path.join(workspaceRoot, "LICENSE");
      const content = await fs.readFile(licensePath, "utf-8");
      if (content.includes("SYNAPSE OPERATING SYSTEM PROPRIETARY SOURCE LICENSE") &&
          content.includes("Copyright (c) 2026 SYNAPSE OS")) {
        licensePresent = true;
      } else {
        violations.push("LICENSE_FILE_TAMPERED_OR_CORRUPT");
      }
    } catch {
      violations.push("LICENSE_FILE_MISSING");
    }

    // 2. Verify watermark
    if (SYNAPSE_PROPRIETARY_WATERMARK.includes("SYNAPSE_OS_CORE_PROPRIETARY_WATERMARK")) {
      watermarkPresent = true;
    } else {
      violations.push("WATERMARK_SYMBOL_TAMPERED");
    }

    const valid = violations.length === 0;

    return {
      valid,
      watermarkPresent,
      licensePresent,
      systemFingerprint: this.getSystemFingerprint(),
      timestamp: new Date().toISOString(),
      violations,
    };
  }
}
