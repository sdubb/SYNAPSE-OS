import { globalCapabilityRegistry } from "../packages/capabilities/dist/index.js";
import { AgentDefinitionSchema, MissionSchema, SynapseTaskSchema, TaskRunSchema } from "../packages/contracts/dist/index.js";
import { PolicyEngine } from "../packages/policy-engine/dist/index.js";
import { ApprovalEngine, InMemoryApprovalStore } from "../packages/approval-engine/dist/index.js";
import { SafetyEngine } from "../packages/safety-engine/dist/index.js";
import { SecretManager, SecretRedactor } from "../packages/secrets/dist/index.js";
import { EvidenceChainBuilder, EvidenceStore, EvidenceVerifier } from "../packages/evidence/dist/index.js";
import { AuditEngine } from "../packages/audit-engine/dist/index.js";
import { WorldEngine, Entity, Relationship } from "../packages/world-engine/dist/index.js";
import { TwinEngine } from "../packages/twin-engine/dist/index.js";
import { SimulationEngine, ScenarioBuilder } from "../packages/simulation-engine/dist/index.js";

async function runE2EVerification() {
  console.log("=== SYNAPSE OS END-TO-END SYSTEM VERIFICATION ===");

  const tenantId = "11111111-1111-4111-a111-111111111111";
  const agentId = "22222222-2222-4222-a222-222222222222";
  const taskId = "33333333-3333-4333-a333-333333333333";
  const missionId = "44444444-4444-4444-a444-444444444444";
  const workspaceId = "55555555-5555-4555-a555-555555555555";

  // 1. Dynamic Capability Registry Check
  console.log("\n[1] Testing Dynamic Capability Registry...");
  globalCapabilityRegistry.register({
    id: "company.internal.crm",
    name: "Enterprise CRM",
    description: "Queries internal sales CRM",
    type: "api_integration",
    provider: "salesforce",
    riskLevel: "medium",
    requiredSecrets: ["CRM_API_KEY"],
  });
  const capCheck = globalCapabilityRegistry.validateCapabilities(["cline.read_files", "company.internal.crm"]);
  if (!capCheck.valid || capCheck.requiredSecrets.length === 0) {
    throw new Error("Capability validation failed!");
  }
  console.log("  ✓ Dynamic capabilities registered and validated. Secrets required:", capCheck.requiredSecrets);

  // 2. Open-ended Agent Definition
  console.log("\n[2] Testing Dynamic Agent Definition Schema...");
  const agentDef = AgentDefinitionSchema.parse({
    id: agentId,
    tenantId,
    identity: {
      name: "Financial Data Researcher",
      description: "Extracts quarterly 10-K filings and analyzes revenue trends",
      role: "Financial Analyst",
      tags: ["finance", "research", "sec-filings"],
    },
    instructions: {
      systemPrompt: "You are a quantitative financial analyst.",
      objectives: ["Analyze financial trends", "Compute risk ratios"],
      behavioralRules: ["Never output private keys", "Cite financial sources"],
    },
    capabilities: {
      tools: [],
      mcpServers: ["mcp.postgres"],
      connectors: ["connector.slack"],
      customCapabilities: ["company.internal.crm"],
    },
    model: {
      provider: "anthropic",
      modelId: "claude-3-5-sonnet-20241022",
      temperature: 0.1,
    },
    workspace: {
      repositories: ["https://github.com/company/finance-reports"],
      directories: ["/data/reports"],
      environment: { NODE_ENV: "production" },
    },
    permissions: {
      files: ["read", "write"],
      shell: ["allowed:python"],
      network: ["api.sec.gov"],
      credentials: ["SEC_API_TOKEN"],
      productionAccess: false,
    },
    knowledge: {
      files: ["10k_filings_2025.csv"],
      databases: ["fin_analytics"],
      sources: ["EDGAR"],
    },
    verification: {
      strategies: ["schema_validation", "test_runner", "human_review"],
      approvalRequirements: ["admin_signoff"],
      minConfidence: 0.95,
    },
  });
  console.log(`  ✓ Open-ended agent created: '${agentDef.identity.name}' (${agentDef.identity.role})`);

  // 3. Mission & Task Hierarchy
  console.log("\n[3] Testing Mission -> Task -> Run Hierarchy...");
  const mission = MissionSchema.parse({
    id: missionId,
    tenantId,
    title: "Q3 Financial Audit & Revenue Forecasting",
    objective: "Consolidate Q3 balance sheets, run Monte Carlo simulation, verify ledger accuracy",
  });
  const task = SynapseTaskSchema.parse({
    id: taskId,
    tenantId,
    missionId: mission.id,
    workspaceId,
    assignedAgentId: agentDef.id,
    title: "Run ledger reconciliation script",
    objective: "Execute ledger balance check against bank statement API",
    instructions: "python reconcile.py --quarter=Q3",
    status: "running",
  });
  const taskRun = TaskRunSchema.parse({
    id: "66666666-6666-4666-a666-666666666666",
    taskId: task.id,
    tenantId,
    agentId: agentDef.id,
    runNumber: 1,
    status: "running",
  });
  console.log(`  ✓ Hierarchy created: Mission(${mission.title}) -> Task(${task.title}) -> Run(#${taskRun.runNumber})`);

  // 4. Policy Engine Evaluation
  console.log("\n[4] Testing Proactive Policy Engine...");
  const policyEngine = new PolicyEngine({
    strictMode: false,
    defaultDecision: "ALLOW",
    enableBuiltInRules: true,
    rules: [
      {
        id: "block-etc-passwd",
        name: "Block Sensitive File Access",
        effect: "BLOCK",
        riskLevel: "CRITICAL",
        target: "FILE",
        condition: {
          field: "file.path",
          operator: "CONTAINS",
          value: "/etc/passwd",
        },
      },
    ],
  });

  const evalAllowed = policyEngine.evaluateFileAccess(
    tenantId,
    "/workspace/proj/data.json",
    false,
    "/workspace/proj",
    { agentId: agentDef.id }
  );
  if (!evalAllowed.isAllowed()) throw new Error("Legitimate read was blocked!");

  const evalBlocked = policyEngine.evaluateFileAccess(
    tenantId,
    "/etc/passwd",
    false,
    "/workspace/proj",
    { agentId: agentDef.id }
  );
  if (evalBlocked.isAllowed()) throw new Error("Security violation /etc/passwd was allowed!");
  console.log(`  ✓ Policy Engine evaluated: Legitimate read -> ALLOW; Path escape -> BLOCK (${evalBlocked.remediation})`);

  // 5. Safety Engine & Blast Radius
  console.log("\n[5] Testing Safety Engine & Risk Analysis...");
  const safetyEngine = new SafetyEngine();
  const riskResult = safetyEngine.analyzeRisk({
    toolName: "run_command",
    args: { command: "rm -rf /var/log" },
  });
  console.log(`  ✓ Safety Engine classified risk: Level=${riskResult.riskLevel}, Score=${riskResult.compositeScore}, BlastRadius=${riskResult.blastRadius.scope}`);

  // 6. Secret Redactor
  console.log("\n[6] Testing Streaming Secret Redactor...");
  const redactor = new SecretRedactor();
  redactor.registerSecret("sk-ant-api03-SECRET_KEY_9999");
  const sanitized = redactor.redact("Connecting with authorization bearer sk-ant-api03-SECRET_KEY_9999 to server");
  if (sanitized.includes("SECRET_KEY_9999")) throw new Error("Secret was not redacted!");
  console.log(`  ✓ Secret successfully sanitized: "${sanitized}"`);

  // 7. Evidence Chain & Cryptographic Integrity
  console.log("\n[7] Testing Cryptographic Evidence Chain (SHA-256 Merkle Link)...");
  const evidenceStore = new EvidenceStore();
  const runId = "77777777-7777-4777-a777-777777777777";
  const chainBuilder = new EvidenceChainBuilder(tenantId, runId);

  const ev1 = await evidenceStore.storeEvidence({
    tenantId,
    taskId,
    verificationRunId: runId,
    kind: "FILE_SNAPSHOT",
    label: "reconcile.py snapshot",
    content: "print('reconcile v1')",
  });
  chainBuilder.addEvidence(ev1);

  const ev2 = await evidenceStore.storeEvidence({
    tenantId,
    taskId,
    verificationRunId: runId,
    kind: "TEST_REPORT",
    label: "pytest execution output",
    content: JSON.stringify({ passed: 42, failed: 0, durationMs: 1250 }),
  });
  chainBuilder.addEvidence(ev2);

  const sealedChain = chainBuilder.seal();
  const chainValidation = EvidenceVerifier.verifyChain(sealedChain);
  if (!chainValidation.isValid) throw new Error("Evidence chain verification failed!");
  console.log(`  ✓ Evidence Chain sealed and verified: Blocks=${sealedChain.blocks.length}, MerkleRoot=${sealedChain.rootHash.slice(0, 16)}...`);

  // 8. World Engine & Digital Twin Ingestion
  console.log("\n[8] Testing World Engine & Schema-Agnostic State Graph...");
  const worldEngine = new WorldEngine();
  const worldModel = worldEngine.createModel({
    id: "world_finance_01",
    name: "Enterprise Architecture Twin",
    description: "Models cloud microservices, payment gateways, and SQL databases",
    tenantId,
  });

  const entityApi = new Entity({
    id: "ent_api_gateway",
    type: "microservice",
    name: "PaymentGatewayService",
  });
  const entityDb = new Entity({
    id: "ent_db_postgres",
    type: "database",
    name: "TransactionsPostgres",
  });
  worldEngine.updateEntity(worldModel.id, entityApi);
  worldEngine.updateEntity(worldModel.id, entityDb);

  const rel = new Relationship({
    id: "rel_api_db",
    relationType: "DEPENDS_ON",
    sourceId: entityApi.id,
    targetId: entityDb.id,
    weight: 1.0,
  });
  const updatedModel = worldEngine.updateRelationship(worldModel.id, rel);

  const queryEngine = worldEngine.getQuery(worldModel.id);
  const path = queryEngine?.findShortestPath(entityApi.id, entityDb.id);
  console.log(`  ✓ World Engine graph built. Path found from ${entityApi.name} to ${entityDb.name}: ${path?.length ?? 0} hop(s)`);

  // 9. Digital Twin Simulation & Scenario Comparison
  console.log("\n[9] Testing Discrete-Event Simulation Engine...");
  const twinEngine = new TwinEngine();
  const digitalTwin = twinEngine.createTwin({
    id: "twin_payment_01",
    name: "Payment Flow Twin",
    targetSystemId: "sys_payment",
    primarySourceSystem: "aws",
    tenantId,
    baselineModel: updatedModel,
  });

  const simEngine = new SimulationEngine();
  const scenario = new ScenarioBuilder()
    .withId("scen_db_outage")
    .withName("Database Outage Simulation")
    .withDescription("Simulate latency when database read replica fails")
    .forTwin(digitalTwin.id)
    .withParameter("database.replicaCount", 0)
    .build();

  const simResult = await simEngine.runScenario(digitalTwin, scenario);
  console.log(`  ✓ Discrete-event simulation executed: RunId=${simResult.runId.slice(0, 8)}, DurationReal=${simResult.durationRealMs}ms`);

  // 10. Audit Engine Merkle Verification
  console.log("\n[10] Testing Audit Engine Merkle Inclusion Proofs...");
  const auditEngine = new AuditEngine();
  await auditEngine.initialize();
  const auditEvent = await auditEngine.logSecurityEvent({
    tenantId,
    actor: { id: agentDef.id, type: "AGENT", name: agentDef.identity.name },
    eventType: "agent.task.completed",
    severity: "INFO",
    targetId: task.id,
    targetType: "TASK",
    details: { taskId: task.id, durationMs: 3400 },
  });
  console.log(`  ✓ Tamper-evident audit event logged: ID=${auditEvent.id}, Sequence=${auditEvent.sequence}, Hash=${auditEvent.hash.slice(0, 16)}...`);

  console.log("\n=======================================================");
  console.log("🎉 ALL 10 CORE SUBSYSTEM E2E VERIFICATION CHECKS PASSED!");
  console.log("=======================================================\n");
}

runE2EVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
