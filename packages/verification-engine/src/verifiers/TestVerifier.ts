import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";

const execAsync = promisify(exec);

export class TestVerifier {
  public static async verify(
    assertion: VerificationAssertion,
    workspaceRoot?: string
  ): Promise<AssertionResult> {
    const startTime = performance.now();
    const command = assertion.target || "npm test";
    const cwd = workspaceRoot ?? process.cwd();
    const timeout = (assertion.timeoutSeconds ?? 120) * 1000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 20 * 1024 * 1024,
      });

      const durationMs = performance.now() - startTime;
      const passInfo = this.parseTestOutput(stdout + "\n" + stderr);

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "TEST_SUITE_PASS",
        verdict: "PASS",
        actualValue: passInfo,
        stdout: stdout.slice(-2000), // Keep last 2KB
        stderr: stderr.slice(-1000),
        executionTimeMs: Math.round(durationMs),
      };
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const error = err as { stdout?: string; stderr?: string; message?: string };
      const combinedOutput = (error.stdout ?? "") + "\n" + (error.stderr ?? "");
      const passInfo = this.parseTestOutput(combinedOutput);

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "TEST_SUITE_PASS",
        verdict: "FAIL",
        actualValue: passInfo,
        errorMessage: error.message ?? "Test suite execution failed",
        stdout: (error.stdout ?? "").slice(-2000),
        stderr: (error.stderr ?? "").slice(-1000),
        executionTimeMs: Math.round(durationMs),
      };
    }
  }

  private static parseTestOutput(output: string): { passed?: number; failed?: number; total?: number; summary: string } {
    const passedMatch = output.match(/(\d+)\s+passed/i);
    const failedMatch = output.match(/(\d+)\s+failed/i);
    const totalMatch = output.match(/Tests:\s*(\d+)\s+total/i);

    const passed = passedMatch && passedMatch[1] ? parseInt(passedMatch[1], 10) : undefined;
    const failed = failedMatch && failedMatch[1] ? parseInt(failedMatch[1], 10) : undefined;
    const total = totalMatch && totalMatch[1] ? parseInt(totalMatch[1], 10) : undefined;

    return {
      passed,
      failed,
      total,
      summary: failed ? `${failed} tests failed` : passed ? `All ${passed} tests passed` : "Completed",
    };
  }
}
