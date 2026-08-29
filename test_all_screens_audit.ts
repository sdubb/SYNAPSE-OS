import crypto from "node:crypto";
import { DatabaseClient } from "./packages/database/src/client.js";
import { tenants } from "./packages/database/src/schemas/tenants.js";
import { agents } from "./packages/database/src/schemas/agents.js";
import { sessions } from "./packages/database/src/schemas/sessions.js";
import { tasks } from "./packages/database/src/schemas/tasks.js";
import { approvals } from "./packages/database/src/schemas/approvals.js";
import { auditLogs } from "./packages/database/src/schemas/audits.js";
import { verifications } from "./packages/database/src/schemas/verification.js";
import { worldModels } from "./packages/database/src/schemas/worlds.js";
import { eq, count } from "drizzle-orm";
import WebSocket from "ws";

const BASE_URL = "http://localhost:3000/api/v1";

async function req(path: string, options: RequestInit = {}, tenantId?: string, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, ok: res.ok, data: json };
  } catch (err: any) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function main() {
  const dbClient = DatabaseClient.getInstance();
  const db = await dbClient.connect();

  console.log("================================================================================");
  console.log("0. FRESH TENANT, ZERO SEED DATA VERIFICATION");
  console.log("================================================================================");

  // 1. Create a brand new tenant directly in database
  const newTenantId = crypto.randomUUID();
  const [createdTenant] = await db.insert(tenants).values({
    id: newTenantId,
    name: "Acme Autonomous Logistics Corp",
    slug: `acme-${Date.now()}`,
    plan: "enterprise",
    status: "active",
    settings: { environment: "production", autoVerify: true },
  }).returning();

  console.log("\n[0.1] Created New Tenant Raw Row:");
  console.log(JSON.stringify(createdTenant, null, 2));

  // 2. Auth login / token retrieval
  const authRes = await req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@acme-logistics.internal", apiKey: "sk_live_acme_991823" }),
  }, newTenantId);

  console.log("\n[0.2] Auth Login / Token Response:");
  console.log(JSON.stringify(authRes, null, 2));
  const token = authRes.data?.token || "mock_jwt_acme_token";

  // 3. Confirm all tables have zero rows for this tenant
  const [agentCount] = await db.select({ val: count() }).from(agents).where(eq(agents.tenantId, newTenantId));
  const [sessionCount] = await db.select({ val: count() }).from(sessions).where(eq(sessions.tenantId, newTenantId));
  const [taskCount] = await db.select({ val: count() }).from(tasks).where(eq(tasks.tenantId, newTenantId));
  const [approvalCount] = await db.select({ val: count() }).from(approvals).where(eq(approvals.tenantId, newTenantId));
  const [auditCount] = await db.select({ val: count() }).from(auditLogs).where(eq(auditLogs.tenantId, newTenantId));
  const [verificationCount] = await db.select({ val: count() }).from(verifications).where(eq(verifications.tenantId, newTenantId));
  const [worldCount] = await db.select({ val: count() }).from(worldModels).where(eq(worldModels.tenantId, newTenantId));

  console.log("\n[0.3] Initial Tenant Table Counts (Must all be 0):");
  console.log(JSON.stringify({
    tenantId: newTenantId,
    agents: agentCount.val,
    sessions: sessionCount.val,
    tasks: taskCount.val,
    approvals: approvalCount.val,
    auditLogs: auditCount.val,
    verifications: verificationCount.val,
    worldModels: worldCount.val,
  }, null, 2));

  console.log("\n================================================================================");
  console.log("1. COMMAND CENTER (/)");
  console.log("================================================================================");
  const ccAgents = await req("/agents", { method: "GET" }, newTenantId, token);
  const ccSessions = await req("/sessions", { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/agents:", JSON.stringify(ccAgents, null, 2));
  console.log("GET /api/v1/sessions:", JSON.stringify(ccSessions, null, 2));

  console.log("\n================================================================================");
  console.log("2. OPERATOR (/operator)");
  console.log("================================================================================");
  // Create agent first to test start session
  const agentCreated = await req("/agents", {
    method: "POST",
    body: JSON.stringify({
      name: "Logistics Analyst Agent",
      role: "Logistics Specialist",
      model: { provider: "openrouter", modelId: "nvidia/nemotron-3.5-lightning:free" },
      systemPrompt: "You analyze supply chain bottlenecks.",
    }),
  }, newTenantId, token);
  const agentId = agentCreated.data?.id;

  // Create session
  const startSessionRes = await req("/sessions", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      initialPrompt: "Check fleet distribution",
      workspaceId: crypto.randomUUID(),
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/sessions:", JSON.stringify(startSessionRes, null, 2));
  const sessionId = startSessionRes.data?.id;

  // Test WebSocket on :3001
  console.log("\nTesting WebSocket /ws on ws://localhost:3001...");
  let wsConnected = false;
  let wsEvents: any[] = [];
  try {
    const ws = new WebSocket("ws://localhost:3001");
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve();
      }, 2500);

      ws.on("open", () => {
        wsConnected = true;
        ws.send(JSON.stringify({ type: "subscribe", channel: `session:${sessionId}` }));
      });
      ws.on("message", (data) => {
        try {
          wsEvents.push(JSON.parse(data.toString()));
        } catch {
          wsEvents.push(data.toString());
        }
      });
      ws.on("error", () => resolve());
      ws.on("close", () => resolve());
    });
  } catch (err: any) {
    console.log("WebSocket Connection Error:", err.message);
  }
  console.log("WebSocket Connected:", wsConnected, "| Events Received Count:", wsEvents.length);

  // Subroutes: messages, usage, pause, resume
  const sessMessages = await req(`/sessions/${sessionId}/messages`, { method: "GET" }, newTenantId, token);
  const sessUsage = await req(`/sessions/${sessionId}/usage`, { method: "GET" }, newTenantId, token);
  const sessPause = await req(`/sessions/${sessionId}/pause`, { method: "POST" }, newTenantId, token);
  const sessResume = await req(`/sessions/${sessionId}/resume`, { method: "POST" }, newTenantId, token);
  console.log("GET /api/v1/sessions/:id/messages:", JSON.stringify(sessMessages, null, 2));
  console.log("GET /api/v1/sessions/:id/usage:", JSON.stringify(sessUsage, null, 2));
  console.log("POST /api/v1/sessions/:id/pause:", JSON.stringify(sessPause, null, 2));
  console.log("POST /api/v1/sessions/:id/resume:", JSON.stringify(sessResume, null, 2));

  console.log("\n================================================================================");
  console.log("3. RUNS (/runs, Run Detail)");
  console.log("================================================================================");
  const runsList = await req("/sessions", { method: "GET" }, newTenantId, token);
  const runDetail = await req(`/sessions/${sessionId}`, { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/sessions list:", JSON.stringify(runsList, null, 2));
  console.log(`GET /api/v1/sessions/${sessionId}:`, JSON.stringify(runDetail, null, 2));

  // Check detail tabs endpoints
  const tabTimeline = await req(`/sessions/${sessionId}/timeline`, { method: "GET" }, newTenantId, token);
  const tabTools = await req(`/sessions/${sessionId}/tools`, { method: "GET" }, newTenantId, token);
  const tabFiles = await req(`/sessions/${sessionId}/files`, { method: "GET" }, newTenantId, token);
  const tabChanges = await req(`/sessions/${sessionId}/changes`, { method: "GET" }, newTenantId, token);
  const tabApprovals = await req(`/sessions/${sessionId}/approvals`, { method: "GET" }, newTenantId, token);
  const tabAudit = await req(`/sessions/${sessionId}/audit`, { method: "GET" }, newTenantId, token);
  console.log("Tab Timeline route status:", tabTimeline.status, JSON.stringify(tabTimeline.data));
  console.log("Tab Tools route status:", tabTools.status, JSON.stringify(tabTools.data));
  console.log("Tab Files route status:", tabFiles.status, JSON.stringify(tabFiles.data));
  console.log("Tab Changes route status:", tabChanges.status, JSON.stringify(tabChanges.data));
  console.log("Tab Approvals route status:", tabApprovals.status, JSON.stringify(tabApprovals.data));
  console.log("Tab Audit route status:", tabAudit.status, JSON.stringify(tabAudit.data));

  console.log("\n================================================================================");
  console.log("4. AGENTS (/agents, Create, Detail)");
  console.log("================================================================================");
  const preAgentList = await req("/agents", { method: "GET" }, newTenantId, token);
  console.log("Pre-create GET /api/v1/agents:", JSON.stringify(preAgentList, null, 2));

  // POST with 8-step config shape
  const fullAgentConfig = {
    name: "Enterprise Financial Auditor",
    description: "Performs autonomous ledger reconciliation and anomaly detection",
    role: "Financial Auditor",
    model: { provider: "openrouter", modelId: "nvidia/nemotron-3.5-lightning:free", temperature: 0.1 },
    systemPrompt: "You are a certified fraud examiner and GAAP auditor.",
    capabilities: ["file_system:read", "database:query", "reporting:generate"],
    workspace: { rootDirectory: "/workspace/finance", mode: "isolated" },
    policies: ["policy_strict_audit_01", "policy_pii_masking"],
    verification: { requiredRunners: ["reconciliation_check", "balance_sheet_integrity"], threshold: 100 },
    limits: { maxIterations: 50, maxTokensPerTurn: 4096, maxDailyCostUsd: 150.0 },
  };

  const agentCreatedFull = await req("/agents", {
    method: "POST",
    body: JSON.stringify(fullAgentConfig),
  }, newTenantId, token);
  console.log("POST /api/v1/agents with 8-step config:", JSON.stringify(agentCreatedFull, null, 2));

  const agentDetail = await req(`/agents/${agentCreatedFull.data?.id}`, { method: "GET" }, newTenantId, token);
  console.log(`GET /api/v1/agents/${agentCreatedFull.data?.id}:`, JSON.stringify(agentDetail, null, 2));

  console.log("\n================================================================================");
  console.log("5. TASKS (/tasks, Create Task)");
  console.log("================================================================================");
  const preTaskList = await req("/tasks", { method: "GET" }, newTenantId, token);
  console.log("Pre-create GET /api/v1/tasks:", JSON.stringify(preTaskList, null, 2));

  const taskCreated = await req("/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: "Reconcile Q3 General Ledger",
      description: "Verify all debit and credit entries match bank statements",
      agentId: agentCreatedFull.data?.id,
      status: "READY",
      priority: "HIGH",
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/tasks:", JSON.stringify(taskCreated, null, 2));

  const postTaskList = await req("/tasks", { method: "GET" }, newTenantId, token);
  console.log("Post-create GET /api/v1/tasks:", JSON.stringify(postTaskList, null, 2));

  console.log("\n================================================================================");
  console.log("6. TEAMS (/teams, Create Team, Topology)");
  console.log("================================================================================");
  const getTeams = await req("/teams", { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/teams:", JSON.stringify(getTeams, null, 2));

  const createTeamExplicit = await req("/teams", {
    method: "POST",
    body: JSON.stringify({
      name: "Security Red Team",
      mode: "EXPLICIT",
      leaderAgentId: agentCreatedFull.data?.id,
      memberAgentIds: [agentId, agentCreatedFull.data?.id],
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/teams (Explicit Mode):", JSON.stringify(createTeamExplicit, null, 2));

  console.log("\n================================================================================");
  console.log("7. VERIFICATION (/verification, Detail)");
  console.log("================================================================================");
  const preVerif = await req("/verification", { method: "GET" }, newTenantId, token);
  console.log("Pre-create GET /api/v1/verification:", JSON.stringify(preVerif, null, 2));

  const verifCreated = await req("/verification", {
    method: "POST",
    body: JSON.stringify({
      taskId: taskCreated.data?.id,
      sessionId: sessionId,
      agentId: agentCreatedFull.data?.id,
      verdict: "PASS",
      summary: "All 5 integrity assertions passed with 0 violations",
      assertionResults: [
        { assertionId: "ass_01", assertionName: "Ledger Balance Check", type: "DB_EQUALS", verdict: "PASS", executionTimeMs: 12 },
        { assertionId: "ass_02", assertionName: "Audit Signature Verification", type: "CRYPTO_SIG", verdict: "PASS", executionTimeMs: 4 },
      ],
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/verification:", JSON.stringify(verifCreated, null, 2));

  const verifDetail = await req(`/verification/${verifCreated.data?.id}`, { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/verification/:id:", JSON.stringify(verifDetail, null, 2));

  console.log("\n================================================================================");
  console.log("8. GOVERNANCE — APPROVALS (/governance/approvals)");
  console.log("================================================================================");
  const preApprovals = await req("/approvals", { method: "GET" }, newTenantId, token);
  console.log("Pre-create GET /api/v1/approvals:", JSON.stringify(preApprovals, null, 2));

  const approvalCreated = await req("/approvals", {
    method: "POST",
    body: JSON.stringify({
      agentId: agentCreatedFull.data?.id,
      sessionId: sessionId,
      taskId: taskCreated.data?.id,
      toolName: "execute_sql",
      toolParameters: { query: "ALTER TABLE transactions ADD COLUMN verified boolean;" },
      riskLevel: "HIGH",
      reason: "Schema alteration requires DBA review",
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/approvals:", JSON.stringify(approvalCreated, null, 2));

  const postApprovals = await req("/approvals", { method: "GET" }, newTenantId, token);
  console.log("Post-create GET /api/v1/approvals:", JSON.stringify(postApprovals, null, 2));

  console.log("\n================================================================================");
  console.log("9. GOVERNANCE — POLICIES (/governance/policies)");
  console.log("================================================================================");
  const prePolicies = await req("/policies", { method: "GET" }, newTenantId, token);
  console.log("Pre-create GET /api/v1/policies:", JSON.stringify(prePolicies, null, 2));

  const policyCreated = await req("/policies", {
    method: "POST",
    body: JSON.stringify({
      name: "Enforce Workspace Boundary Policy",
      description: "Blocks any file operation that navigates outside assigned workspace root",
      type: "ACCESS_CONTROL",
      rules: [
        {
          when: { event: "file_access", pathPattern: "../**" },
          and: [{ condition: "isOutsideWorkspace", equals: true }],
          then: { action: "BLOCK", reason: "Path traversal violation" },
        },
      ],
      action: "BLOCK",
      priority: 100,
      enabled: true,
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/policies:", JSON.stringify(policyCreated, null, 2));

  const postPolicies = await req("/policies", { method: "GET" }, newTenantId, token);
  console.log("Post-create GET /api/v1/policies:", JSON.stringify(postPolicies, null, 2));

  console.log("\n================================================================================");
  console.log("10. GOVERNANCE — AUDIT (/governance/audit)");
  console.log("================================================================================");
  const auditAll = await req("/audit", { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/audit (all):", JSON.stringify(auditAll, null, 2));

  const auditFiltered = await req(`/audit?eventType=SECURITY_ALERT&agentId=${agentCreatedFull.data?.id}`, { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/audit (filtered):", JSON.stringify(auditFiltered, null, 2));

  console.log("\n================================================================================");
  console.log("11. WORLD & SIMULATION (/world, /simulations)");
  console.log("================================================================================");
  const preWorld = await req("/world/models", { method: "GET" }, newTenantId, token);
  console.log("Pre-create GET /api/v1/world/models:", JSON.stringify(preWorld, null, 2));

  const worldCreated = await req("/world/models", {
    method: "POST",
    body: JSON.stringify({
      name: "Global E-Commerce Topology",
      description: "Payment gateways, checkout clusters, inventory DBs",
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/world/models:", JSON.stringify(worldCreated, null, 2));

  const worldId = worldCreated.data?.id;

  // Run simulation scenario: what happens if payment service goes offline
  const simRunRes = await req("/simulations", {
    method: "POST",
    body: JSON.stringify({
      name: "Payment Gateway Outage Simulation",
      worldModelId: worldId,
      scenario: {
        targetService: "PaymentGatewayService",
        failureMode: "OFFLINE",
        durationMinutes: 30,
      },
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/simulations:", JSON.stringify(simRunRes, null, 2));

  console.log("\n================================================================================");
  console.log("12. AUTOMATION (/automation / /schedules)");
  console.log("================================================================================");
  const preSchedules = await req("/schedules", { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/schedules:", JSON.stringify(preSchedules, null, 2));

  const scheduleCreated = await req("/schedules", {
    method: "POST",
    body: JSON.stringify({
      name: "Nightly Financial Audit Schedule",
      cronExpression: "0 2 * * *",
      agentId: agentCreatedFull.data?.id,
      taskId: taskCreated.data?.id,
      enabled: true,
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/schedules:", JSON.stringify(scheduleCreated, null, 2));

  console.log("\n================================================================================");
  console.log("13. CAPABILITIES (/capabilities / /connectors / /providers)");
  console.log("================================================================================");
  const getCapabilities = await req("/capabilities", { method: "GET" }, newTenantId, token);
  const getConnectors = await req("/connectors", { method: "GET" }, newTenantId, token);
  const getProviders = await req("/providers", { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/capabilities:", JSON.stringify(getCapabilities, null, 2));
  console.log("GET /api/v1/connectors:", JSON.stringify(getConnectors, null, 2));
  console.log("GET /api/v1/providers:", JSON.stringify(getProviders, null, 2));

  console.log("\n================================================================================");
  console.log("14. WORKSPACES (/workspaces)");
  console.log("================================================================================");
  const getWorkspaces = await req("/workspaces", { method: "GET" }, newTenantId, token);
  console.log("GET /api/v1/workspaces:", JSON.stringify(getWorkspaces, null, 2));

  const createWorkspace = await req("/workspaces", {
    method: "POST",
    body: JSON.stringify({
      name: "Audit Analysis Workspace",
      rootPath: "/workspaces/acme-audit",
    }),
  }, newTenantId, token);
  console.log("POST /api/v1/workspaces:", JSON.stringify(createWorkspace, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
