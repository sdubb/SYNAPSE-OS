console.log("Loading @cline/core...");
try {
  const { ClineCore } = await import("@cline/core");
  console.log("SUCCESS: Loaded ClineCore from @cline/core!");
  console.log("ClineCore keys:", Object.keys(ClineCore));
} catch (err) {
  console.error("FAIL: Could not load @cline/core:", err);
}
