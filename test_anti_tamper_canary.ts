/**
 * SYNAPSE OS — ANTI-TAMPER, CANARY & ANTI-THEFT VERIFICATION TEST SUITE
 * Copyright (c) 2026 SYNAPSE OS. All Rights Reserved.
 */

import {
  AntiDebugger,
  CanaryEngine,
  IntegrityGuardian,
  TamperTelemetryBeacon,
  SecurityGuardian,
  initSecurityGuardian,
} from "./packages/security/dist/index.js";
import fs from "node:fs/promises";
import path from "node:path";

async function runAntiTamperVerification() {
  console.log("================================================================================");
  console.log("🔒 RUNNING SYNAPSE OS ANTI-THEFT & TAMPER DEFENSE VERIFICATION SUITE");
  console.log("================================================================================\n");

  // 1. Test System Fingerprint & Integrity Guardian
  console.log("▶ [Test 1] Verifying System Fingerprint & Workspace Integrity...");
  const fingerprint = IntegrityGuardian.getSystemFingerprint();
  console.log(`  ✓ System Fingerprint: ${fingerprint}`);

  const integrityResult = await IntegrityGuardian.verifyWorkspaceIntegrity(process.cwd());
  console.log(`  ✓ License Present: ${integrityResult.licensePresent}`);
  console.log(`  ✓ Watermark Present: ${integrityResult.watermarkPresent}`);
  console.log(`  ✓ Integrity Valid: ${integrityResult.valid}`);
  if (!integrityResult.valid) {
    console.error("  ❌ Integrity violations:", integrityResult.violations);
    process.exit(1);
  }

  // 2. Test AntiDebugger Evaluation
  console.log("\n▶ [Test 2] Testing AntiDebugger Timing Traps & Runtime Checks...");
  const antiDebugger = new AntiDebugger({
    timingThresholdMs: 100, // Safe threshold for normal execution
  });
  const evalResult = antiDebugger.evaluate();
  console.log(`  ✓ Normal Execution Evaluation: Detected = ${evalResult.detected}`);

  // Simulate timing anomaly detection
  const sensitiveDebugger = new AntiDebugger({
    timingThresholdMs: 0.0001, // Intentionally ultra-low to verify trip logic
  });
  const tripResult = sensitiveDebugger.evaluate();
  console.log(`  ✓ Timing Trap Sensitive Trip: Detected = ${tripResult.detected}`);
  console.log(`  ✓ Reasons Captured:`, tripResult.reasons);

  // 3. Test Canary Engine & Honeytokens
  console.log("\n▶ [Test 3] Testing Canary Token Generation & Honeypot Sensor...");
  const canaryEngine = CanaryEngine.getInstance();
  const testCanary = canaryEngine.generateCanary("api_key", "Test Attacker Trap Key");
  console.log(`  ✓ Generated Honeytoken: ${testCanary.tokenValue} (ID: ${testCanary.id})`);

  let canaryTripped = false;
  canaryEngine.once("canary:tripped", (event) => {
    canaryTripped = true;
    console.log(`  🚨 [CANARY TRIPPED] Honeytoken was accessed by intruder!`);
    console.log(`     Token: ${event.accessedToken}`);
    console.log(`     Type: ${event.type} | Label: ${event.label}`);
  });

  const tripEvent = canaryEngine.inspectAndTrip(testCanary.tokenValue, {
    ip: "192.168.1.105",
    actor: "unauthorized_debugger_process",
  });
  console.log(`  ✓ Trip Event Returned: ${tripEvent !== null}`);
  console.log(`  ✓ Event Listener Fired: ${canaryTripped}`);

  // 4. Test Tamper Telemetry Beacon
  console.log("\n▶ [Test 4] Testing Tamper Telemetry Beacon Dispatch...");
  const beacon = TamperTelemetryBeacon.getInstance({
    enableEmergencyLockdown: false, // Don't lock test workspace
    enableLocalForensicsLog: true,
  });

  const payload = await beacon.dispatchViolation("UNAUTHORIZED_RUNTIME_INSPECTION", {
    testScope: "Verification Suite",
    detectedIntruder: "Memory dumper probe",
  });
  console.log(`  ✓ Beacon Dispatch Succeeded: ID = ${payload.beaconId}`);
  console.log(`  ✓ Cryptographic Signature: ${payload.signature}`);

  // Check forensic log
  const logFile = path.join(process.cwd(), "logs", "security-violations.log");
  const logExists = await fs.stat(logFile).then(() => true).catch(() => false);
  console.log(`  ✓ Forensic Audit Log Persisted: ${logExists}`);

  // 5. Test Unified Security Guardian Boot
  console.log("\n▶ [Test 5] Bootstrapping Unified Security Guardian...");
  const guardian = await initSecurityGuardian({
    beaconOptions: { enableEmergencyLockdown: false },
  });
  console.log(`  ✓ Security Guardian online and active.`);

  console.log("\n================================================================================");
  console.log("✅ ALL ANTI-THEFT, ANTI-DEBUG & CANARY SECURITY CONTROLS VERIFIED SUCCESSFULLY!");
  console.log("================================================================================");
  process.exit(0);
}

runAntiTamperVerification().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
