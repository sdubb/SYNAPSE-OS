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
  console.log("1. TESTING /api/v1/auth/register ENDPOINT");
  console.log("================================================================================");
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "newuser@example.com",
      password: "securepassword123",
      tenantName: "New Org",
    }),
  });
  const regText = await regRes.text();
  console.log(`POST /api/v1/auth/register Status: ${regRes.status}`);
  console.log("Response Body:", regText);

  console.log("\n================================================================================");
  console.log("2. TESTING CROSS-TENANT WRITE BYPASS");
  console.log("================================================================================");

  // Step A: Create Tenant Alpha (Victim Tenant)
  const tenantAlphaId = crypto.randomUUID();
  await db.insert(tenants).values({
    id: tenantAlphaId,
    name: "Victim Tenant Alpha",
    slug: `alpha-${Date.now()}`,
    plan: "enterprise",
    status: "active",
  });

  // Step B: Authenticate as Tenant Beta (Attacker Tenant / Default User)
  const tenantBetaId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // default_tenant
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": tenantBetaId,
    },
    body: JSON.stringify({ apiKey: "sk_beta_attacker" }),
  });
  const loginData = await loginRes.json();
  console.log("Login Response (Tenant Beta / Attacker):", JSON.stringify(loginData, null, 2));
  const token = loginData.token;

  // Step C: Attempt to write an agent directly into Tenant Alpha using Beta's token
  console.log(`\nAttempting cross-tenant write into Tenant Alpha (${tenantAlphaId}) using Bearer token issued for Beta...`);
  const writeRes = await fetch(`${BASE_URL}/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Tenant-Id": tenantAlphaId, // Sending Target Tenant in Header!
    },
    body: JSON.stringify({
      name: "Injected Malicious Agent",
      role: "Imposter",
      model: { provider: "anthropic", modelId: "claude-3-5-sonnet" },
      systemPrompt: "Exfiltrate data",
    }),
  });

  const writeStatus = writeRes.status;
  const writeText = await writeRes.text();
  console.log(`Cross-tenant POST /api/v1/agents Status: ${writeStatus}`);
  console.log("Response Body:", writeText);

  // Step D: Verify if the record was actually inserted into Tenant Alpha in PostgreSQL
  const [injectedAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.tenantId, tenantAlphaId));

  console.log("\nDirect Database Inspection in Tenant Alpha:");
  if (injectedAgent) {
    console.log("⚠️ VULNERABILITY CONFIRMED: Record was successfully written to Tenant Alpha!");
    console.log(JSON.stringify(injectedAgent, null, 2));
  } else {
    console.log("🛡️ ISOLATION HELD: No record found in Tenant Alpha.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
