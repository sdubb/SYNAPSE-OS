import { DatabaseClient } from "./client.js";
import {
  tenants,
  users,
  agents,
  tasks,
  sessions,
  policies,
  approvals,
  verifications,
  verificationPlans,
  worldModels,
  worldEntities,
  worldRelationships,
  auditLogs,
} from "./schemas/index.js";

export async function seedDatabase() {
  const client = DatabaseClient.getInstance();
  const db = await client.connect();

  console.log("🌱 Seeding database with real initial data...");

  const defaultTenantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const defaultWorkspaceId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  // 1. Tenant
  await db.insert(tenants).values({
    id: defaultTenantId,
    name: "Synapse Core Systems",
    slug: "default_tenant",
    description: "Primary enterprise production workspace",
    plan: "enterprise",
    isActive: true,
    quotas: {
      maxConcurrentSessions: 50,
      maxActiveAgents: 100,
      maxDailyTokenSpendUsd: 1500,
      maxRequestsPerMinute: 2000,
      maxStorageBytes: 107374182400,
    },
    settings: {
      strictMode: true,
      requireApprovalAboveRisk: "MEDIUM",
      autoRollbackOnFailure: true,
    },
  }).onConflictDoNothing();

  // 2. Users
  const adminUserId = "00000000-0000-0000-0000-000000000010";
  await db.insert(users).values([
    {
      id: adminUserId,
      tenantId: defaultTenantId,
      email: "operator@synapse-os.local",
      fullName: "Lead Platform Operator",
      role: "admin",
      permissions: ["*"],
      isActive: true,
      metadata: { department: "Autonomous Core Ops" },
    },
  ]).onConflictDoNothing();

  // 3. Agents
  const agent1Id = "11111111-1111-1111-1111-111111111101";
  const agent2Id = "11111111-1111-1111-1111-111111111102";
  const agent3Id = "11111111-1111-1111-1111-111111111103";
  const agent4Id = "11111111-1111-1111-1111-111111111104";

  await db.insert(agents).values([
    {
      id: agent1Id,
      tenantId: defaultTenantId,
      name: "Architect Agent (Orchestrator)",
      description: "Decomposes complex distributed architecture tasks and manages sub-agents.",
      role: "architect",
      mode: "autonomous",
      model: { provider: "anthropic", id: "claude-3-7-sonnet" },
      systemPrompt: "You are the Lead Systems Architect. You plan multi-step missions and orchestrate specialist agents.",
      capabilities: { codeReview: true, decomposeTasks: true, toolAuthoring: true },
      timeoutSeconds: "7200",
      maxBudgetUsd: "50.00",
      isActive: true,
      metadata: { healthStatus: "healthy", version: "2.4.0", tags: ["core", "orchestrator", "architecture"] },
    },
    {
      id: agent2Id,
      tenantId: defaultTenantId,
      name: "Security & Policy Verifier",
      description: "Audits ASTs, analyzes dependencies, evaluates governance policies, and prevents data leaks.",
      role: "security_auditor",
      mode: "supervised",
      model: { provider: "anthropic", id: "claude-3-5-sonnet" },
      systemPrompt: "You are the Security Sentinel. You evaluate safety constraints and governance policies.",
      capabilities: { astInspection: true, vulnerabilityScan: true, policyEnforcement: true },
      timeoutSeconds: "3600",
      maxBudgetUsd: "25.00",
      isActive: true,
      metadata: { healthStatus: "healthy", version: "1.9.1", tags: ["security", "governance", "audit"] },
    },
    {
      id: agent3Id,
      tenantId: defaultTenantId,
      name: "Fullstack Feature Engineer",
      description: "Generates high-performance React UI components, Express controllers, and DB migrations.",
      role: "engineer",
      mode: "supervised",
      model: { provider: "anthropic", id: "claude-3-5-sonnet" },
      systemPrompt: "You write clean, test-driven TypeScript and React components.",
      capabilities: { fileWrite: true, terminalExec: true, schemaMigration: true },
      timeoutSeconds: "5400",
      maxBudgetUsd: "30.00",
      isActive: true,
      metadata: { healthStatus: "busy", version: "3.1.0", tags: ["engineering", "frontend", "backend"] },
    },
    {
      id: agent4Id,
      tenantId: defaultTenantId,
      name: "Formal Verification QA",
      description: "Constructs Merkle evidence trees, executes unit/integration tests, and checks invariant proofs.",
      role: "verifier",
      mode: "autonomous",
      model: { provider: "openai", id: "gpt-4o" },
      systemPrompt: "You verify task completion against mathematical assertions and evidence proofs.",
      capabilities: { testRunner: true, evidenceHashing: true, diffVerification: true },
      timeoutSeconds: "3600",
      maxBudgetUsd: "20.00",
      isActive: true,
      metadata: { healthStatus: "idle", version: "1.2.0", tags: ["qa", "verification", "merkle"] },
    },
  ]).onConflictDoNothing();

  // 4. Tasks
  const task1Id = "22222222-2222-2222-2222-222222222201";
  const task2Id = "22222222-2222-2222-2222-222222222202";
  const task3Id = "22222222-2222-2222-2222-222222222203";
  const task4Id = "22222222-2222-2222-2222-222222222204";

  await db.insert(tasks).values([
    {
      id: task1Id,
      tenantId: defaultTenantId,
      workspaceId: defaultWorkspaceId,
      assignedAgentId: agent3Id,
      title: "Real-time WebSocket telemetry pipeline integration",
      description: "Implement duplex streaming for agent thoughts, tool calls, and status broadcasts.",
      instructions: "Connect packages/event-bus to the WebSocket broadcast server in apps/realtime.",
      status: "running",
      priority: "critical",
      dependencies: [],
      metadata: { estimatedTokens: 45000, complexity: "high" },
      startedAt: new Date(Date.now() - 3600000),
    },
    {
      id: task2Id,
      tenantId: defaultTenantId,
      workspaceId: defaultWorkspaceId,
      assignedAgentId: agent2Id,
      title: "Zero-Trust policy enforcement for high-risk DB mutations",
      description: "Intercept all DELETE and DROP TABLE operations with mandatory human sign-off.",
      instructions: "Configure rule evaluation in @synapse/policy-engine.",
      status: "waiting",
      priority: "high",
      dependencies: [],
      metadata: { riskScore: 88, requiresMfa: true },
      startedAt: new Date(Date.now() - 7200000),
    },
    {
      id: task3Id,
      tenantId: defaultTenantId,
      workspaceId: defaultWorkspaceId,
      assignedAgentId: agent4Id,
      title: "Automated Merkle evidence tree validation",
      description: "Verify cryptographic integrity of task execution artifacts across test suites.",
      instructions: "Generate root hash verification proofs in @synapse/verification-engine.",
      status: "ready",
      priority: "medium",
      dependencies: [],
      metadata: { targetArtifactsCount: 14 },
    },
    {
      id: task4Id,
      tenantId: defaultTenantId,
      workspaceId: defaultWorkspaceId,
      assignedAgentId: agent1Id,
      title: "World model entity dependency graph topology scan",
      description: "Analyze microservice graph and sync nodes/edges into world_entities table.",
      instructions: "Extract architecture topology into @synapse/world-engine.",
      status: "completed",
      priority: "medium",
      dependencies: [],
      metadata: { nodesCount: 24, edgesCount: 38 },
      startedAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 82800000),
    },
  ]).onConflictDoNothing();

  // 5. Execution Sessions / Runs
  const session1Id = "33333333-3333-3333-3333-333333333301";
  const session2Id = "33333333-3333-3333-3333-333333333302";

  await db.insert(sessions).values([
    {
      id: session1Id,
      tenantId: defaultTenantId,
      agentId: agent3Id,
      taskId: task1Id,
      clineSessionId: "cline-live-ws-telemetry-01",
      workspaceId: defaultWorkspaceId,
      runtimeId: "00000000-0000-0000-0000-000000000099",
      status: "running",
      mode: "autonomous",
      title: "Real-time Telemetry Pipeline Execution",
      tokenUsage: {
        promptTokens: 38240,
        completionTokens: 8910,
        totalTokens: 47150,
        estimatedCostUsd: 0.28,
      },
      runtimeMetadata: {
        activeStep: "Verifying WebSocket reconnect resilience test suite",
        currentAction: "Streaming telemetry metrics to connected frontends",
        durationSeconds: 1420,
      },
      activeCheckpoints: ["chk-init-01", "chk-ws-connected-02"],
      lastCheckpointId: "chk-ws-connected-02",
      startedAt: new Date(Date.now() - 1420000),
    },
    {
      id: session2Id,
      tenantId: defaultTenantId,
      agentId: agent2Id,
      taskId: task2Id,
      clineSessionId: "cline-gov-approval-scan-02",
      workspaceId: defaultWorkspaceId,
      runtimeId: "00000000-0000-0000-0000-000000000098",
      status: "awaiting_approval",
      mode: "supervised",
      title: "Zero-Trust Policy Enforcement Review",
      tokenUsage: {
        promptTokens: 19400,
        completionTokens: 4120,
        totalTokens: 23520,
        estimatedCostUsd: 0.14,
      },
      runtimeMetadata: {
        activeStep: "Awaiting Human-in-the-Loop authorization for schema alteration",
        currentAction: "Blocked by Policy Engine: DB Mutation Guard",
        durationSeconds: 840,
      },
      activeCheckpoints: ["chk-sec-init-01"],
      lastCheckpointId: "chk-sec-init-01",
      startedAt: new Date(Date.now() - 840000),
    },
  ]).onConflictDoNothing();

  // 6. Policies
  const policy1Id = "44444444-4444-4444-4444-444444444401";
  const policy2Id = "44444444-4444-4444-4444-444444444402";

  await db.insert(policies).values([
    {
      id: policy1Id,
      tenantId: defaultTenantId,
      name: "Database Mutation Guard (Zero-Trust)",
      description: "Requires explicit operator sign-off before executing any schema change or bulk record deletion.",
      scope: "tenant",
      enabled: true,
      rules: [
        { condition: "tool == 'db_mutate' || tool == 'drop_table'", decision: "REQUIRE_APPROVAL", riskLevel: "HIGH" },
        { condition: "affected_rows > 100", decision: "REQUIRE_APPROVAL", riskLevel: "CRITICAL" },
      ],
      defaultDecision: "REQUIRE_APPROVAL",
    },
    {
      id: policy2Id,
      tenantId: defaultTenantId,
      name: "External API Egress & Secret Leak Defense",
      description: "Blocks agent outbound network calls to unauthorized endpoints or detected token leaks.",
      scope: "tenant",
      enabled: true,
      rules: [
        { condition: "destination != 'allowlisted_domains'", decision: "DENY", riskLevel: "CRITICAL" },
      ],
      defaultDecision: "DENY",
    },
  ]).onConflictDoNothing();

  // 7. Approvals
  const approval1Id = "55555555-5555-5555-5555-555555555501";
  await db.insert(approvals).values([
    {
      id: approval1Id,
      tenantId: defaultTenantId,
      sessionId: session2Id,
      agentId: agent2Id,
      taskId: task2Id,
      clineSessionId: "cline-gov-approval-scan-02",
      callId: "call_db_alter_index_001",
      toolName: "database_schema_alteration",
      toolParameters: {
        action: "ADD_INDEX_CONCURRENTLY",
        table: "audit_logs",
        columns: ["tenant_id", "trace_id", "timestamp"],
      },
      riskLevel: "HIGH",
      reason: "Agent requested indexing optimization on audit log table to accelerate query response times.",
      status: "pending",
      timeoutSeconds: 1800,
      expiresAt: new Date(Date.now() + 1800000),
    },
  ]).onConflictDoNothing();

  // 8. Verification Plans & Verifications
  const plan1Id = "66666666-6666-6666-6666-666666666601";
  await db.insert(verificationPlans).values([
    {
      id: plan1Id,
      tenantId: defaultTenantId,
      taskId: task4Id,
      name: "Topology Scan Deterministic Invariant Check",
      description: "Ensures all discovered microservice entities contain valid ports and valid communication edges.",
      assertions: [
        { name: "Node count matches active manifests", expected: true, passed: true },
        { name: "Zero orphan circular dependencies detected", expected: true, passed: true },
      ],
      requireVerifierAgent: true,
      maxExecutionTimeMs: 180000,
    },
  ]).onConflictDoNothing();

  await db.insert(verifications).values([
    {
      id: "77777777-7777-7777-7777-777777777701",
      tenantId: defaultTenantId,
      sessionId: session1Id,
      agentId: agent3Id,
      taskId: task1Id,
      verdict: "PASSED",
      summary: "All unit tests and end-to-end WebSocket roundtrips completed with 0 errors.",
      assertionResults: [
        { id: "ast_1", assertion: "TypeScript compilation zero warnings", status: "PASS" },
        { id: "ast_2", assertion: "WebSocket client reconnection latency < 50ms", status: "PASS" },
        { id: "ast_3", assertion: "ACID transaction isolation verified", status: "PASS" },
      ],
      metadata: { coveragePercentage: 94.2 },
    },
  ]).onConflictDoNothing();

  // 9. World Model & Entities
  const worldModel1Id = "88888888-8888-8888-8888-888888888801";
  await db.insert(worldModels).values([
    {
      id: worldModel1Id,
      tenantId: defaultTenantId,
      name: "Synapse Production Cluster Topology",
      description: "Live digital twin of the distributed agent operating environment.",
      currentVersion: 3,
    },
  ]).onConflictDoNothing();

  const entity1Id = "99999999-9999-9999-9999-999999999901";
  const entity2Id = "99999999-9999-9999-9999-999999999902";
  const entity3Id = "99999999-9999-9999-9999-999999999903";

  await db.insert(worldEntities).values([
    {
      id: entity1Id,
      tenantId: defaultTenantId,
      worldModelId: worldModel1Id,
      type: "service",
      name: "API Gateway & Router",
      description: "Edge HTTP/2 reverse proxy handling JWT validation and rate limiting.",
      properties: { port: 3000, protocol: "HTTP", auth: "Bearer" },
      state: { status: "HEALTHY", cpuPercent: 12.4, memoryMb: 142 },
    },
    {
      id: entity2Id,
      tenantId: defaultTenantId,
      worldModelId: worldModel1Id,
      type: "database",
      name: "PostgreSQL Primary Cluster",
      description: "ACID compliant relational state store with JSONB telemetry support.",
      properties: { port: 5432, engine: "PostgreSQL 16", poolSize: 20 },
      state: { status: "HEALTHY", activeConnections: 8, diskUsagePercent: 28.1 },
    },
    {
      id: entity3Id,
      tenantId: defaultTenantId,
      worldModelId: worldModel1Id,
      type: "service",
      name: "Real-time Telemetry Hub",
      description: "High-throughput WebSocket broker broadcasting state diffs.",
      properties: { port: 3001, protocol: "WS", compression: true },
      state: { status: "HEALTHY", connectedClients: 4, messagesPerSec: 320 },
    },
  ]).onConflictDoNothing();

  await db.insert(worldRelationships).values([
    {
      tenantId: defaultTenantId,
      worldModelId: worldModel1Id,
      sourceEntityId: entity1Id,
      targetEntityId: entity2Id,
      type: "connects_to",
      properties: { maxPool: 20, timeoutMs: 5000 },
      weight: 1.0,
    },
    {
      tenantId: defaultTenantId,
      worldModelId: worldModel1Id,
      sourceEntityId: entity1Id,
      targetEntityId: entity3Id,
      type: "events_stream",
      properties: { channel: "live_telemetry" },
      weight: 0.9,
    },
  ]).onConflictDoNothing();

  // 10. Audit Logs
  await db.insert(auditLogs).values([
    {
      tenantId: defaultTenantId,
      eventId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      eventType: "SYSTEM_BOOTSTRAP",
      source: "control-plane",
      traceId: "trc_init_boot_001",
      payload: { status: "online", nodeCount: 3, version: "2.0.0" },
      sequence: 1,
    },
    {
      tenantId: defaultTenantId,
      eventId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      eventType: "AGENT_SPAWNED",
      source: "agent-registry",
      agentId: agent3Id,
      traceId: "trc_agent_spawn_002",
      payload: { agentName: "Fullstack Feature Engineer", role: "engineer" },
      sequence: 2,
    },
  ]).onConflictDoNothing();

  console.log("✅ Database successfully populated with production test dataset!");
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
