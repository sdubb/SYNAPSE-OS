import crypto from "node:crypto";
import { PolicyEngine } from "./packages/policy-engine/src/PolicyEngine.js";
import { SafetyEngine } from "./packages/safety-engine/src/SafetyEngine.js";
import { DatabaseClient } from "./packages/database/src/client.js";
import { ApprovalRepository } from "./packages/database/src/repositories/ApprovalRepository.js";
import { TenantContext } from "@synapse/tenancy";

async function main() {
  const tenantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const agentId = "11111111-1111-1111-1111-111111111102";
  const taskId = "22222222-2222-2222-2222-222222222202";
  const sessionId = "33333333-3333-3333-3333-333333333302";

  console.log("--- 1. Policy Evaluation ---");
  const policyEngine = new PolicyEngine();
  const destructiveCommand = "rm -rf /";
  const policyDecision = policyEngine.evaluateCommand(destructiveCommand);
  console.log("POLICY_DECISION:", JSON.stringify(policyDecision, null, 2));

  console.log("\n--- 2. Safety Engine Risk & Blast Radius Assessment ---");
  const safetyEngine = new SafetyEngine();
  const riskAssessment = safetyEngine.analyzeRisk({
    toolName: "execute_command",
    args: { command: destructiveCommand },
  });
  console.log("SAFETY_RISK_ASSESSMENT:", JSON.stringify(riskAssessment, null, 2));

  console.log("\n--- 3. Postgres Approval Record Insertion ---");
  const dbClient = DatabaseClient.getInstance();
  const db = await dbClient.connect();
  const approvalRepo = new ApprovalRepository(db);

  const approvalId = crypto.randomUUID();

  await TenantContext.runAsync({ tenantId }, async () => {
    const created = await approvalRepo.create({
      id: approvalId,
      tenantId,
      sessionId,
      agentId,
      taskId,
      clineSessionId: "cline-sess-destructive-01",
      callId: "call_rm_rf_root_001",
      toolName: "execute_command",
      toolParameters: { command: destructiveCommand },
      riskLevel: riskAssessment.riskLevel,
      reason: `Policy require approval. Blast radius score: ${riskAssessment.blastRadius.score}`,
      status: "pending",
      timeoutSeconds: 300,
      expiresAt: new Date(Date.now() + 300000),
    });
    console.log("RAW_POSTGRES_ROW_CREATED:", JSON.stringify(created, null, 2));

    const rawRowBefore = await approvalRepo.findById(approvalId);
    console.log("\nRAW_DB_ROW_PENDING:", JSON.stringify(rawRowBefore, null, 2));

    console.log("\n--- 4. Resolving Approval via ApprovalRepository ---");
    const resolved = await approvalRepo.resolveDecision(approvalId, {
      decision: "APPROVED",
      decisionReason: "Human operator approved with override",
      decidedByUserId: "00000000-0000-0000-0000-000000000010",
    });
    console.log("RAW_DB_ROW_AFTER_RESOLUTION:", JSON.stringify(resolved, null, 2));
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
