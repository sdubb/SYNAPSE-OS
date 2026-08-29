import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";

const execAsync = promisify(exec);

export class BuildVerifier {
  public static async verify(
    assertion: VerificationAssertion,
    workspaceRoot?: string
  ): Promise<AssertionResult> {
    const startTime = performance.now();
    const command = assertion.target || "npm run build";
    const cwd = workspaceRoot ?? process.cwd();
    const timeout = (assertion.timeoutSeconds ?? 180) * 1000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 20 * 1024 * 1024,
      });

      // Optional: Check if expected output artifact directory or file exists
      const expectedArtifact = assertion.metadata["expectedArtifact"] as string | undefined;
      if (expectedArtifact) {
        const artifactPath = path.resolve(cwd, expectedArtifact);
        await fs.stat(artifactPath);
      }

      const durationMs = performance.now() - startTime;

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "BUILD_SUCCESS",
        verdict: "PASS",
        stdout: stdout.slice(-2000),
        stderr: stderr.slice(-1000),
        executionTimeMs: Math.round(durationMs),
      };
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const error = err as { stdout?: string; stderr?: string; message?: string };

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "BUILD_SUCCESS",
        verdict: "FAIL",
        errorMessage: error.message ?? "Build execution failed with non-zero exit code",
        stdout: (error.stdout ?? "").slice(-2000),
        stderr: (error.stderr ?? "").slice(-1000),
        executionTimeMs: Math.round(durationMs),
      };
    }
  }
}
