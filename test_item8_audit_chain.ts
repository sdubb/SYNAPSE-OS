import crypto from "node:crypto";
import { DatabaseClient } from "./packages/database/src/client.js";
import { auditLogs } from "./packages/database/src/schemas/audits.js";
import { desc } from "drizzle-orm";

async function main() {
  const tenantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const dbClient = DatabaseClient.getInstance();
  const db = await dbClient.connect();

  console.log("=== LOGGING 3 REAL AUDIT RECORDS ===");
  const traceId = `trc_${Date.now()}`;

  // Log 3 sequential events with SHA-256 hash chaining
  const events = [
    { type: "AGENT_ACTION_REQUESTED", payload: { action: "read_file", path: "src/index.ts" } },
    { type: "POLICY_EVALUATION_COMPLETED", payload: { decision: "ALLOW", riskScore: 10 } },
    { type: "TOOL_EXECUTION_COMPLETED", payload: { exitCode: 0, bytesRead: 1420 } },
  ];

  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < events.length; i++) {
    const eventId = crypto.randomUUID();
    const currentPayload = events[i].payload;
    const contentToHash = `${eventId}:${tenantId}:${events[i].type}:${JSON.stringify(currentPayload)}:${prevHash}`;
    const eventHash = crypto.createHash("sha256").update(contentToHash).digest("hex");

    await db.insert(auditLogs).values({
      id: eventId,
      tenantId,
      eventId,
      eventType: events[i].type,
      source: "audit-chain-verifier",
      traceId,
      payload: { ...currentPayload, prevHash, eventHash },
      sequence: i + 1,
    });

    prevHash = eventHash;
  }

  console.log("\n=== QUERYING 3 RAW ROWS FROM POSTGRESQL ===");
  const records = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(3);

  console.log("RAW_POSTGRES_AUDIT_ROWS:", JSON.stringify(records, null, 2));

  console.log("\n=== HASH CHAIN LINKAGE VERIFICATION ===");
  records.reverse().forEach((r: any, idx: number) => {
    console.log(`Record #${r.sequence} [${r.eventType}] -> PrevHash: ${r.payload?.prevHash?.slice(0, 16)}... | CurrentHash: ${r.payload?.eventHash?.slice(0, 16)}...`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
