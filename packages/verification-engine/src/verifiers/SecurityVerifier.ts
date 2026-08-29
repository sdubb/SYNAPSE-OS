import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";
import { SecretDetector } from "@synapse/safety-engine";

const execAsync = promisify(exec);

export class SecurityVerifier {
  public static async verify(
    assertion: VerificationAssertion,
    workspaceRoot?: string
  ): Promise<AssertionResult> {
    const startTime = performance.now();
    const cwd = workspaceRoot ?? process.cwd();
    const scanType = (assertion.metadata["scanType"] as string) ?? "secrets";

    try {
      if (scanType === "audit") {
        try {
          const { stdout } = await execAsync("npm audit --json", { cwd });
          const auditJson = JSON.parse(stdout) as { metadata?: { vulnerabilities?: { high?: number; critical?: number } } };
          const high = auditJson.metadata?.vulnerabilities?.high ?? 0;
          const critical = auditJson.metadata?.vulnerabilities?.critical ?? 0;
          const isClean = high === 0 && critical === 0;
          const durationMs = performance.now() - startTime;

          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "SECURITY_SCAN_CLEAN",
            verdict: isClean ? "PASS" : "FAIL",
            actualValue: { highVulnerabilities: high, criticalVulnerabilities: critical },
            errorMessage: isClean ? undefined : `Found ${high} high and ${critical} critical npm vulnerabilities`,
            executionTimeMs: Math.round(durationMs),
          };
        } catch (err: unknown) {
          const durationMs = performance.now() - startTime;
          const error = err as { stdout?: string };
          if (error.stdout) {
            try {
              const auditJson = JSON.parse(error.stdout) as { metadata?: { vulnerabilities?: { high?: number; critical?: number } } };
              const high = auditJson.metadata?.vulnerabilities?.high ?? 0;
              const critical = auditJson.metadata?.vulnerabilities?.critical ?? 0;
              return {
                assertionId: assertion.id,
                assertionName: assertion.name,
                type: "SECURITY_SCAN_CLEAN",
                verdict: high === 0 && critical === 0 ? "PASS" : "FAIL",
                actualValue: { high, critical },
                errorMessage: `Audit found ${high} high and ${critical} critical vulnerabilities`,
                executionTimeMs: Math.round(durationMs),
              };
            } catch {
              // Fallback
            }
          }
          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "SECURITY_SCAN_CLEAN",
            verdict: "FAIL",
            errorMessage: "npm audit failed to run cleanly",
            executionTimeMs: Math.round(durationMs),
          };
        }
      }

      // Default: Scan modified files or target file for secret leaks
      const targetPath = assertion.target ? path.resolve(cwd, assertion.target) : cwd;
      const stat = await fs.stat(targetPath);
      let content = "";

      if (stat.isFile()) {
        content = await fs.readFile(targetPath, "utf-8");
      }

      const scanResult = SecretDetector.scanText(content);
      const isClean = !scanResult.hasSecrets;
      const durationMs = performance.now() - startTime;

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "SECURITY_SCAN_CLEAN",
        verdict: isClean ? "PASS" : "FAIL",
        actualValue: { secretsDetected: scanResult.secretsCount },
        errorMessage: isClean ? undefined : `Security scan detected ${scanResult.secretsCount} leaked credential pattern(s)`,
        executionTimeMs: Math.round(durationMs),
      };
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "SECURITY_SCAN_CLEAN",
        verdict: "FAIL",
        errorMessage: `Security verification scan failed: ${errorMsg}`,
        executionTimeMs: Math.round(durationMs),
      };
    }
  }
}
