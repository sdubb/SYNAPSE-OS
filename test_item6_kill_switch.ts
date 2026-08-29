import { KillSwitch } from "./packages/safety-engine/src/KillSwitch.js";

async function main() {
  const killSwitch = new KillSwitch();
  const sessionId = "sess_target_execution_001";
  const streamId = "stream_token_generator_001";

  console.log("=== TIER 1: Stream Abort ===");
  const streamAbortController = new AbortController();
  killSwitch.registerStreamController(streamId, streamAbortController);
  console.log("Before Level 1: streamAbortController.signal.aborted =", streamAbortController.signal.aborted);
  const l1Result = killSwitch.triggerLevel1(streamId, "Stream timeout exceeded");
  console.log("After Level 1: triggerResult =", l1Result, "| signal.aborted =", streamAbortController.signal.aborted);

  console.log("\n=== TIER 2: Session Graceful Stop ===");
  const sessionAbortController = new AbortController();
  killSwitch.registerStreamController(sessionId, sessionAbortController);
  console.log("Before Level 2: isSessionStopped =", killSwitch.isSessionStopped(sessionId));
  killSwitch.triggerLevel2(sessionId, "Operator triggered session halt");
  console.log("After Level 2: isSessionStopped =", killSwitch.isSessionStopped(sessionId), "| signal.aborted =", sessionAbortController.signal.aborted);

  console.log("\n=== TIER 3: Host / Workspace Isolation & Revocation ===");
  const workspacePath = process.cwd();
  console.log("Before Level 3: isWorkspaceLocked =", killSwitch.isWorkspaceLocked(workspacePath), "| isTokenRevoked =", killSwitch.isTokenRevoked(sessionId));
  await killSwitch.triggerLevel3(sessionId, "Critical security breach detected", {
    workspaceRoot: workspacePath,
    revokeSessionTokens: true,
  });
  console.log("After Level 3: isWorkspaceLocked =", killSwitch.isWorkspaceLocked(workspacePath), "| isTokenRevoked =", killSwitch.isTokenRevoked(sessionId));

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
