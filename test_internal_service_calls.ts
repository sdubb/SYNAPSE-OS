import crypto from "node:crypto";
import { DatabaseClient } from "./packages/database/src/client.js";
import { tenants } from "./packages/database/src/schemas/tenants.js";
import { agents } from "./packages/database/src/schemas/agents.js";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:3000/api/v1";

async function main() {
  const dbClient = DatabaseClient.getInstance();
  const db = await dbClient.connect();

  console.log("================================================================================");
  console.log("TESTING LEGITIMATE AUTHENTICATED CALLS & INTERNAL SERVICE SCOPES");
  console.log("================================================================================");

  // 1. Same-tenant legitimate write
  const tenantId = crypto.randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    name: "Legitimate Tenant Org",
    slug: `legit-${Date.now()}`,
    plan: "enterprise",
    status: "active",
  });

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-Id": tenantId },
    body: JSON.stringify({ email: "admin@legit.org" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  console.log("\n[1] Legitimate Same-Tenant Write Test:");
  const legitWriteRes = await fetch(`${BASE_URL}/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
    },
    body: JSON.stringify({
      name: "Authorized Agent",
      role: "Logistics Specialist",
      model: { provider: "anthropic", modelId: "claude-3-5-sonnet" },
    }),
  });
  console.log(`POST /api/v1/agents Status: ${legitWriteRes.status} (Expected 201)`);
  const legitAgent = await legitWriteRes.json();
  console.log("Created Agent ID:", legitAgent.id);

  // 2. Internal privileged service call (e.g. system scheduler / background worker)
  console.log("\n[2] Internal Privileged Service Call Test (System Key):");
  const systemServiceRes = await fetch(`${BASE_URL}/agents`, {
    method: "GET",
    headers: {
      "X-Api-Key": "synapse_system_internal_service_key_991823",
      "X-Tenant-Id": tenantId,
    },
  });
  console.log(`System Key GET /api/v1/agents Status: ${systemServiceRes.status} (Expected 200)`);
  const agentsList = await systemServiceRes.json();
  console.log("Agents retrieved by system worker:", agentsList.length);

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
