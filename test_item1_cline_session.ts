import { ClineEngine } from "./packages/engine-adapter/src/ClineEngine.js";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY || "mock-openrouter-key";

  const engine = new ClineEngine({
    clientName: "synapse-os",
    defaultWorkspaceDirectory: process.cwd(),
  });

  console.log("Initializing ClineEngine...");
  await engine.initialize();
  console.log("ClineEngine initialized successfully.");

  console.log("Starting session with prompt: 'list files in this directory' using OpenRouter (nvidia/nemotron-3.5-lightning:free)...");
  const { session, startResult } = await engine.startSession({
    tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    agentId: "11111111-1111-1111-1111-111111111101",
    workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    prompt: "list files in this directory",
    cwd: process.cwd(),
    modelConfig: {
      provider: "openrouter",
      modelId: "nvidia/nemotron-3.5-lightning:free",
      apiKey: apiKey,
    },
  });

  console.log("RAW_CLINE_CORE_START_RESULT:");
  console.log(JSON.stringify(startResult, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR_IN_CLINE_SESSION:", err);
  process.exit(1);
});
