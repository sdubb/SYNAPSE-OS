import crypto from "node:crypto";
import { DatabaseClient } from "./packages/database/src/client.js";
import { tenants } from "./packages/database/src/schemas/tenants.js";
import { agents } from "./packages/database/src/schemas/agents.js";
import { sessions } from "./packages/database/src/schemas/sessions.js";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:3000/api/v1";

async function main() {
  const dbClient = DatabaseClient.getInstance();
  const db = await dbClient.connect();

  console.log("================================================================================");
  console.log("TESTING OPERATOR REAL ROUTE PIPELINE (CLINE BACKEND INTEGRATION)");
  console.log("================================================================================");

  // 1. Setup fresh tenant and agent
  const tenantId = crypto.randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    name: "Live Operator Test Org",
    slug: `operator-${Date.now()}`,
    plan: "enterprise",
    status: "active",
  });

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-Id": tenantId },
    body: JSON.stringify({ email: "operator@synapse.os" }),
  });
  const { token } = await loginRes.json();

  const agentRes = await fetch(`${BASE_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
    body: JSON.stringify({
      name: "Operator Live Agent",
      role: "Full Stack Engineer",
      model: { provider: "openrouter", modelId: "nvidia/nemotron-3.5-lightning:free" },
    }),
  });
  const agent = await agentRes.json();

  // 2. Start session
  const sessionRes = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
    body: JSON.stringify({
      agentId: agent.id,
      title: "Live Operator Session Verification",
      workspaceId: crypto.randomUUID(),
    }),
  });
  const session = await sessionRes.json();
  const sessionId = session.id;
  console.log(`[1] Created Session ID: ${sessionId} (Status: ${session.status})`);

  // 3. Test GET /messages
  const msgRes = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`, {
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[2] GET /sessions/:id/messages Status: ${msgRes.status}`, await msgRes.json());

  // 4. Test GET /usage
  const usageRes = await fetch(`${BASE_URL}/sessions/${sessionId}/usage`, {
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[3] GET /sessions/:id/usage Status: ${usageRes.status}`, await usageRes.json());

  // 5. Test POST /pause
  const pauseRes = await fetch(`${BASE_URL}/sessions/${sessionId}/pause`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[4] POST /sessions/:id/pause Status: ${pauseRes.status}`);

  const pausedSession = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  console.log(`    DB State after Pause: status = '${pausedSession[0]?.status}'`);

  // 6. Test POST /resume
  const resumeRes = await fetch(`${BASE_URL}/sessions/${sessionId}/resume`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[5] POST /sessions/:id/resume Status: ${resumeRes.status}`);

  const resumedSession = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  console.log(`    DB State after Resume: status = '${resumedSession[0]?.status}'`);

  // 7. Test Forensic Sub-Routes
  const timelineRes = await fetch(`${BASE_URL}/sessions/${sessionId}/timeline`, {
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[6] GET /sessions/:id/timeline Status: ${timelineRes.status}`, await timelineRes.json());

  const filesRes = await fetch(`${BASE_URL}/sessions/${sessionId}/files`, {
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[7] GET /sessions/:id/files Status: ${filesRes.status}`, await filesRes.json());

  const diffRes = await fetch(`${BASE_URL}/sessions/${sessionId}/diff`, {
    headers: { "Authorization": `Bearer ${token}`, "X-Tenant-Id": tenantId },
  });
  console.log(`[8] GET /sessions/:id/diff Status: ${diffRes.status}`, await diffRes.json());

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
