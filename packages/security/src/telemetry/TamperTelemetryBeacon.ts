/**
 * SYNAPSE OS — TAMPER & THEFT TELEMETRY BEACON
 * Copyright (c) 2026 SYNAPSE OS. All Rights Reserved.
 *
 * Dispatches automated forensic telemetry alerts when debugging,
 * honeypot triggers, code extraction, or tampering is detected.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { IntegrityGuardian } from "../integrity/IntegrityGuardian.js";

export type SecurityViolationType =
  | "DEBUGGER_ATTACHED"
  | "DEBUG_FLAGS_DETECTED"
  | "TIMING_TRAP_TRIGGERED"
  | "CANARY_TOKEN_ACCESSED"
  | "HONEYPOT_DATABASE_TRIGGERED"
  | "INTEGRITY_WATERMARK_VIOLATION"
  | "LICENSE_TAMPERING_DETECTED"
  | "PROTOTYPE_POLLUTION_ATTEMPT"
  | "UNAUTHORIZED_RUNTIME_INSPECTION";

export interface SecurityViolationPayload {
  beaconId: string;
  violationType: SecurityViolationType;
  severity: "CRITICAL" | "HIGH" | "EMERGENCY";
  timestamp: string;
  systemFingerprint: string;
  hostInfo: {
    hostname: string;
    platform: string;
    arch: string;
    release: string;
    nodeVersion: string;
    pid: number;
    cwd: string;
    user: string;
  };
  details: Record<string, unknown>;
  stack?: string;
  signature: string;
}

export interface BeaconOptions {
  beaconUrl?: string;
  enableRemoteDispatch?: boolean;
  enableLocalForensicsLog?: boolean;
  enableEmergencyLockdown?: boolean;
  onEmergencyTrigger?: (payload: SecurityViolationPayload) => void | Promise<void>;
}

export class TamperTelemetryBeacon {
  private static instance: TamperTelemetryBeacon;
  private options: Required<BeaconOptions>;
  private static readonly BEACON_SECRET = "synapse_core_beacon_signature_secret_2026";

  constructor(options: BeaconOptions = {}) {
    this.options = {
      beaconUrl: options.beaconUrl || process.env.SYNAPSE_SECURITY_BEACON_URL || "",
      enableRemoteDispatch: options.enableRemoteDispatch ?? true,
      enableLocalForensicsLog: options.enableLocalForensicsLog ?? true,
      enableEmergencyLockdown: options.enableEmergencyLockdown ?? true,
      onEmergencyTrigger: options.onEmergencyTrigger ?? (() => {}),
    };
  }

  public static getInstance(options?: BeaconOptions): TamperTelemetryBeacon {
    if (!TamperTelemetryBeacon.instance) {
      TamperTelemetryBeacon.instance = new TamperTelemetryBeacon(options);
    }
    return TamperTelemetryBeacon.instance;
  }

  /**
   * Dispatches a high-priority security tamper beacon.
   */
  public async dispatchViolation(
    violationType: SecurityViolationType,
    details: Record<string, unknown> = {},
    customStack?: string
  ): Promise<SecurityViolationPayload> {
    const beaconId = `beacon_${crypto.randomBytes(12).toString("hex")}`;
    const timestamp = new Date().toISOString();
    const systemFingerprint = IntegrityGuardian.getSystemFingerprint();

    const hostInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      nodeVersion: process.version,
      pid: process.pid,
      cwd: process.cwd(),
      user: os.userInfo().username || "unknown",
    };

    const rawPayload = `${beaconId}|${violationType}|${timestamp}|${systemFingerprint}|${hostInfo.hostname}|${hostInfo.pid}`;
    const signature = crypto
      .createHmac("sha256", TamperTelemetryBeacon.BEACON_SECRET)
      .update(rawPayload)
      .digest("hex");

    const payload: SecurityViolationPayload = {
      beaconId,
      violationType,
      severity: "EMERGENCY",
      timestamp,
      systemFingerprint,
      hostInfo,
      details,
      stack: customStack || new Error().stack,
      signature,
    };

    // 1. Output Security Alert Banner to Console
    console.error("\n================================================================================");
    console.error("🚨 [SYNAPSE SECURITY BEACON] CRITICAL TAMPER / THEFT VIOLATION DETECTED 🚨");
    console.error(`Violation Type : ${payload.violationType}`);
    console.error(`Beacon ID      : ${payload.beaconId}`);
    console.error(`Timestamp      : ${payload.timestamp}`);
    console.error(`System Hash    : ${payload.systemFingerprint}`);
    console.error(`Host Details   : ${payload.hostInfo.hostname} (${payload.hostInfo.platform}-${payload.hostInfo.arch}) PID: ${payload.hostInfo.pid}`);
    console.error("================================================================================\n");

    // 2. Dispatch to Remote Endpoint (Asynchronously)
    if (this.options.enableRemoteDispatch && this.options.beaconUrl) {
      this.dispatchRemote(payload).catch(() => {});
    }

    // 3. Persist Forensic Log Locally
    if (this.options.enableLocalForensicsLog) {
      await this.persistForensicLog(payload);
    }

    // 4. Trigger Emergency Lockdown if enabled
    if (this.options.enableEmergencyLockdown) {
      await this.executeEmergencyLockdown(payload);
    }

    try {
      await this.options.onEmergencyTrigger(payload);
    } catch (e) {
      console.error("[TamperTelemetryBeacon] onEmergencyTrigger error:", e);
    }

    return payload;
  }

  private async dispatchRemote(payload: SecurityViolationPayload): Promise<void> {
    try {
      if (typeof fetch === "function") {
        await fetch(this.options.beaconUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Synapse-Beacon-Signature": payload.signature,
          },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // Best-effort remote dispatch
    }
  }

  private async persistForensicLog(payload: SecurityViolationPayload): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), "logs");
      await fs.mkdir(logDir, { recursive: true });
      const logFile = path.join(logDir, "security-violations.log");
      const line = JSON.stringify(payload) + "\n";
      await fs.appendFile(logFile, line, "utf-8");
    } catch {
      // Ignore if filesystem is restricted
    }
  }

  private async executeEmergencyLockdown(payload: SecurityViolationPayload): Promise<void> {
    try {
      const lockFile = path.join(process.cwd(), ".synapse-locked");
      await fs.writeFile(
        lockFile,
        JSON.stringify(
          {
            lockedAt: payload.timestamp,
            reason: `Automated Anti-Theft Lock: ${payload.violationType}`,
            beaconId: payload.beaconId,
            systemFingerprint: payload.systemFingerprint,
          },
          null,
          2
        ),
        "utf-8"
      );
    } catch {
      // Fallback
    }
  }
}
