import { VerificationRunner } from "./packages/verification-engine/src/VerificationRunner.js";
import { VerificationPlanCompiler } from "./packages/verification-engine/src/VerificationPlan.js";

async function main() {
  const plan = VerificationPlanCompiler.compile({
    tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    taskId: "22222222-2222-2222-2222-222222222201",
    name: "Verification of Package Configuration",
    description: "Verifies package.json file existence and integrity",
    taskType: "code_change",
    modifiedFiles: ["package.json"],
    workspaceRoot: process.cwd(),
  });

  const result = await VerificationRunner.execute(plan, {
    workspaceRoot: process.cwd(),
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
