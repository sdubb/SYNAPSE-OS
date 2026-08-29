import { DatabaseClient } from "./packages/database/src/client.js";
import { AgentRepository } from "./packages/database/src/repositories/AgentRepository.js";
import { TenantContext } from "@synapse/tenancy";

async function main() {
  const tenantA = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const tenantB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const agentOfTenantA = "11111111-1111-1111-1111-111111111101";

  const dbClient = DatabaseClient.getInstance();
  const db = await dbClient.connect();
  const agentRepo = new AgentRepository(db);

  console.log("=== CROSS-TENANT ACCESS TEST ===");
  console.log("Ambient Context: Tenant B (" + tenantB + ")");
  console.log("Attempting to query Agent owned by Tenant A (" + tenantA + ") explicitly...");

  await TenantContext.runAsync({ tenantId: tenantB }, async () => {
    // Attempt to access an entity owned by Tenant A while executing under Tenant B
    await agentRepo.findById(agentOfTenantA, tenantA);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("RAW_CROSS_TENANT_REJECTION_ERROR:");
  console.error(err);
  process.exit(1);
});
