import crypto from "node:crypto";
import { EvidenceHasher, EvidenceChainBuilder, EvidenceVerifier } from "../packages/evidence/dist/index.js";
import { PolicyEngine } from "../packages/policy-engine/dist/index.js";
import { SafetyEngine, KillSwitch, BlastRadiusCalculator } from "../packages/safety-engine/dist/index.js";
import { TenantIsolation } from "../packages/tenancy/dist/index.js";
import { EncryptionService, SecretManager, SecretRedactor } from "../packages/secrets/dist/index.js";

async function runAdversarialAudit() {
  console.log("=================================================");
  console.log("  ADVERSARIAL VERIFICATION & SECURITY PROOFS");
  console.log("=================================================\n");

  const tenantA = "11111111-1111-4111-a111-111111111111";
  const tenantB = "22222222-2222-4222-a222-222222222222";
  const taskId = "33333333-3333-4333-a333-333333333333";
  const runId = "44444444-4444-4444-a444-444444444444";

  // ----------------------------------------------------
  // TEST 4: Evidence Chain Tamper Detection
  // ----------------------------------------------------
  console.log("[TEST 4] Merkle Evidence Chain Tamper Detection...");
  const builder = new EvidenceChainBuilder(tenantA, runId);
  builder.addEvidence({
    id: crypto.randomUUID() as any,
    tenantId: tenantA as any,
    verificationRunId: runId as any,
    kind: "FILE_SNAPSHOT",
    label: "original_file.txt",
    content: "genuine untampered content",
    contentSha256: EvidenceHasher.hash("genuine untampered content"),
    mimeType: "text/plain",
    byteSize: 26,
    metadata: {},
    createdAt: new Date().toISOString(),
  });
  builder.addEvidence({
    id: crypto.randomUUID() as any,
    tenantId: tenantA as any,
    verificationRunId: runId as any,
    kind: "TEST_REPORT",
    label: "test_report.json",
    content: '{"passed":10}',
    contentSha256: EvidenceHasher.hash('{"passed":10}'),
    mimeType: "application/json",
    byteSize: 13,
    metadata: {},
    createdAt: new Date().toISOString(),
  });
  const sealedChain = builder.seal();
  const validCheck = EvidenceVerifier.verifyChain(sealedChain);
  console.log("  1. Original sealed chain validation:", validCheck.isValid ? "VALID" : "INVALID");

  // Adversarial Tampering: Mutate evidenceSha256 in block 0
  const tamperedChain = JSON.parse(JSON.stringify(sealedChain));
  tamperedChain.blocks[0].evidenceSha256 = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
  const tamperCheck = EvidenceVerifier.verifyChain(tamperedChain);
  console.log("  2. Tampered chain validation result:", tamperCheck.isValid ? "VALID (FAIL)" : "REJECTED (PASS)");
  console.log("     Tamper violations detected:", tamperCheck.violations);
  if (tamperCheck.isValid) {
    throw new Error("Adversarial tamper was NOT detected by EvidenceVerifier!");
  }

  // ----------------------------------------------------
  // TEST 5A: Malicious Path Traversal & Destructive Shell
  // ----------------------------------------------------
  console.log("\n[TEST 5A] Policy Engine Path Traversal & Dangerous Command Blocking...");
  const policyEngine = new PolicyEngine({
    strictMode: true,
    enableBuiltInRules: true,
  });

  // Malicious Traversal #1: Directory Escape
  const traversalCheck = policyEngine.evaluateFileAccess(
    tenantA,
    "../../../../../../etc/passwd",
    false,
    "/workspace/app"
  );
  console.log("  1. Traversal '../../../../../../etc/passwd': Decision =", traversalCheck.decision, "| Remediation =", traversalCheck.remediation);
  if (traversalCheck.isAllowed()) {
    throw new Error("Malicious directory traversal was allowed!");
  }

  // Malicious Traversal #2: System root access
  const sysRootCheck = policyEngine.evaluateFileAccess(
    tenantA,
    "/etc/shadow",
    false,
    "/workspace/app"
  );
  console.log("  2. Sensitive path '/etc/shadow': Decision =", sysRootCheck.decision, "| Remediation =", sysRootCheck.remediation);
  if (sysRootCheck.isAllowed()) {
    throw new Error("Sensitive path /etc/shadow was allowed!");
  }

  // Dangerous Shell #1: rm -rf /
  const rmRfCheck = policyEngine.evaluateCommand(
    tenantA,
    "rm -rf / --no-preserve-root",
    "/workspace/app"
  );
  console.log("  3. Destructive command 'rm -rf /': Decision =", rmRfCheck.decision, "| Remediation =", rmRfCheck.remediation);
  if (rmRfCheck.isAllowed()) {
    throw new Error("Destructive rm -rf was allowed!");
  }

  // ----------------------------------------------------
  // TEST 5B: Blast Radius Score Differences
  // ----------------------------------------------------
  console.log("\n[TEST 5B] Blast Radius Calculation (Trivial Edit vs. Schema Drop)...");
  const trivialScore = BlastRadiusCalculator.calculateFileOperation(
    "/workspace/app/utils.ts",
    "write",
    "/workspace/app"
  );
  const destructiveScore = BlastRadiusCalculator.calculateCommandOperation(
    "DROP TABLE users CASCADE;",
    "/workspace/app"
  );
  console.log(`  1. Trivial edit (/workspace/app/utils.ts) -> Score: ${trivialScore.score}/100, Scope: ${trivialScore.scope}`);
  console.log(`  2. Destructive SQL (DROP TABLE users CASCADE) -> Score: ${destructiveScore.score}/100, Scope: ${destructiveScore.scope}`);
  if (trivialScore.score >= destructiveScore.score) {
    throw new Error("Blast radius failed to distinguish trivial edit from destructive drop!");
  }

  // ----------------------------------------------------
  // TEST 5C: Emergency Kill Switch Execution
  // ----------------------------------------------------
  console.log("\n[TEST 5C] Multi-Level Emergency Kill Switch...");
  const killSwitch = new KillSwitch();
  const streamId = "stream_active_101";
  const sessionId = "ses_active_999";
  const abortCtrl = new AbortController();

  killSwitch.registerStreamController(streamId, abortCtrl);

  // Level 1: Stream Abort
  const lvl1 = killSwitch.triggerLevel1(streamId, "Stream abort requested by user");
  console.log("  1. Kill Level 1 (Stream Abort): Triggered =", lvl1, "| Signal Aborted =", abortCtrl.signal.aborted);
  if (!abortCtrl.signal.aborted) {
    throw new Error("Kill Level 1 failed to abort stream controller!");
  }

  // Level 2: Session Stop
  killSwitch.triggerLevel2(sessionId, "Operator emergency stop");
  const isStopped = killSwitch.isSessionStopped(sessionId);
  console.log("  2. Kill Level 2 (Session Stop): IsStopped =", isStopped);
  if (!isStopped) {
    throw new Error("Kill Level 2 failed to stop session!");
  }

  // Level 3: Emergency Runtime Termination
  await killSwitch.triggerLevel3(sessionId, "Critical compromise detected", {
    workspaceRoot: "/workspace/app",
    revokeSessionTokens: true,
  });
  const isLocked = killSwitch.isWorkspaceLocked("/workspace/app");
  const isRevoked = killSwitch.isTokenRevoked(sessionId);
  console.log("  3. Kill Level 3 (Runtime Kill): WorkspaceLocked =", isLocked, "| TokenRevoked =", isRevoked);
  if (!isLocked || !isRevoked) {
    throw new Error("Kill Level 3 failed to lock workspace or revoke tokens!");
  }

  // ----------------------------------------------------
  // TEST 6: Zero-Trust Multi-Tenancy Isolation
  // ----------------------------------------------------
  console.log("\n[TEST 6] Zero-Trust Multi-Tenancy Isolation Enforcement...");
  let crossTenantRejected = false;
  try {
    TenantIsolation.assertTenantMatch(tenantA, tenantB, "Unauthorized resource access");
  } catch (err: any) {
    crossTenantRejected = true;
    console.log("  ✓ Cross-tenant access attempt (Tenant A accessing Tenant B): REJECTED with error:", err.message);
  }
  if (!crossTenantRejected) {
    throw new Error("Cross-tenant access was not rejected!");
  }

  // ----------------------------------------------------
  // TEST 7: Secrets Encryption at Rest & Redaction
  // ----------------------------------------------------
  console.log("\n[TEST 7] Secrets AES-256-GCM Encryption & Redaction...");
  const encService = new EncryptionService("synapse-super-master-key-32bytes-secure!");
  const secretPayload = "sk-live-super-secret-api-key-9988776655";
  const encryptedPayload = encService.encrypt(secretPayload);
  const encryptedEnv = encService.toEnvelope(tenantA, encryptedPayload);
  console.log("  1. Raw Encrypted Envelope at Rest:");
  console.log("     - Ciphertext:", encryptedEnv.ciphertext.slice(0, 32) + "...");
  console.log("     - IV:", encryptedEnv.iv);
  console.log("     - Auth Tag:", encryptedEnv.authTag);
  console.log("     - Algorithm:", encryptedEnv.algorithm);
  if (encryptedEnv.ciphertext === secretPayload || encryptedEnv.ciphertext.includes("super-secret")) {
    throw new Error("Secret is stored in plaintext or reversible encoding!");
  }

  const decrypted = encService.decryptEnvelope(encryptedEnv);
  if (decrypted !== secretPayload) {
    throw new Error("Decryption failed to recover secret!");
  }
  console.log("  2. Decryption verified: exact plaintext recovered at execution boundary.");

  const redactor = new SecretRedactor();
  redactor.registerSecret(secretPayload);
  const streamInput = `Error in tool call: Failed to authenticate with key ${secretPayload} on remote host.`;
  const streamOutput = redactor.redact(streamInput);
  console.log(`  3. Streaming Redaction output: "${streamOutput}"`);
  if (streamOutput.includes("9988776655") || streamOutput.includes("super-secret")) {
    throw new Error("Secret leaked through redactor!");
  }

  console.log("\n=================================================");
  console.log("🎉 ALL ADVERSARIAL VERIFICATION TESTS PASSED!");
  console.log("=================================================\n");
}

runAdversarialAudit()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Adversarial Verification Failed:", err);
    process.exit(1);
  });
