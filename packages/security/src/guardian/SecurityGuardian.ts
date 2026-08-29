/**
 * SYNAPSE OS — UNIFIED SECURITY & ANTI-THEFT GUARDIAN
 * Copyright (c) 2026 SYNAPSE OS. All Rights Reserved.
 *
 * Coordinates Anti-Debugging, Honeytoken/Canary defense, Integrity Verification,
 * and Tamper Telemetry Beacons across the entire OS lifecycle.
 */

import { AntiDebugger, AntiDebuggerOptions } from "../anti-tamper/AntiDebugger.js";
import { CanaryEngine, CanaryViolationEvent } from "../canary/CanaryEngine.js";
import { IntegrityGuardian, IntegrityCheckResult } from "../integrity/IntegrityGuardian.js";
import { TamperTelemetryBeacon, SecurityViolationPayload, BeaconOptions } from "../telemetry/TamperTelemetryBeacon.js";

export interface GuardianConfig {
  autoStartAntiDebug?: boolean;
  verifyIntegrityOnBoot?: boolean;
  strictLockdownOnTamper?: boolean;
  beaconOptions?: BeaconOptions;
  antiDebugOptions?: AntiDebuggerOptions;
  onViolation?: (payload: SecurityViolationPayload) => void | Promise<void>;
}

export class SecurityGuardian {
  private static instance: SecurityGuardian;
  private antiDebugger: AntiDebugger;
  private canaryEngine: CanaryEngine;
  private beacon: TamperTelemetryBeacon;
  private isInitialized = false;

  constructor(config: GuardianConfig = {}) {
    this.canaryEngine = CanaryEngine.getInstance();
    this.beacon = TamperTelemetryBeacon.getInstance(config.beaconOptions);

    this.antiDebugger = new AntiDebugger({
      ...config.antiDebugOptions,
      onTamperDetected: async (res) => {
        await this.handleTamperDetected(res.reasons, res.metadata);
      },
    });

    // Wire canary tripped event
    this.canaryEngine.on("canary:tripped", async (event: CanaryViolationEvent) => {
      await this.beacon.dispatchViolation("CANARY_TOKEN_ACCESSED", {
        canaryId: event.canaryId,
        type: event.type,
        label: event.label,
        accessedToken: event.accessedToken,
        context: event.context,
      });
    });
  }

  public static getInstance(config?: GuardianConfig): SecurityGuardian {
    if (!SecurityGuardian.instance) {
      SecurityGuardian.instance = new SecurityGuardian(config);
    }
    return SecurityGuardian.instance;
  }

  /**
   * Bootstraps all active defenses (anti-debugging heartbeat, canary trap, integrity verification).
   */
  public async boot(workspaceRoot: string = process.cwd()): Promise<{
    integrity: IntegrityCheckResult;
    antiDebugActive: boolean;
  }> {
    if (this.isInitialized) {
      const integrity = await IntegrityGuardian.verifyWorkspaceIntegrity(workspaceRoot);
      return { integrity, antiDebugActive: true };
    }

    this.isInitialized = true;

    // 1. Verify workspace integrity
    const integrity = await IntegrityGuardian.verifyWorkspaceIntegrity(workspaceRoot);
    if (!integrity.valid) {
      await this.beacon.dispatchViolation("INTEGRITY_WATERMARK_VIOLATION", {
        violations: integrity.violations,
        systemFingerprint: integrity.systemFingerprint,
      });
    }

    // 2. Start Anti-Debug Guardian Heartbeat
    this.antiDebugger.startGuardian();

    // 3. Perform immediate initial evaluation
    const initialCheck = this.antiDebugger.evaluate();
    if (initialCheck.detected) {
      await this.handleTamperDetected(initialCheck.reasons, initialCheck.metadata);
    }

    return {
      integrity,
      antiDebugActive: true,
    };
  }

  private async handleTamperDetected(reasons: string[], metadata?: Record<string, unknown>): Promise<void> {
    const isTimingTrap = reasons.some((r) => r.includes("TIMING_TRAP"));
    const isArgvOrNodeOpts = reasons.some((r) => r.includes("ARGV") || r.includes("NODE_OPTIONS"));
    
    const violationType = isTimingTrap
      ? "TIMING_TRAP_TRIGGERED"
      : isArgvOrNodeOpts
      ? "DEBUG_FLAGS_DETECTED"
      : "DEBUGGER_ATTACHED";

    await this.beacon.dispatchViolation(violationType, {
      reasons,
      metadata,
    });
  }

  public getAntiDebugger(): AntiDebugger {
    return this.antiDebugger;
  }

  public getCanaryEngine(): CanaryEngine {
    return this.canaryEngine;
  }

  public getBeacon(): TamperTelemetryBeacon {
    return this.beacon;
  }
}

/**
 * Top-level convenience bootstrapper.
 */
export async function initSecurityGuardian(config?: GuardianConfig): Promise<SecurityGuardian> {
  const guardian = SecurityGuardian.getInstance(config);
  await guardian.boot();
  return guardian;
}
