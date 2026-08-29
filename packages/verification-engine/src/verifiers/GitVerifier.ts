import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";

const execAsync = promisify(exec);

export class GitVerifier {
  public static async verify(
    assertion: VerificationAssertion,
    workspaceRoot?: string
  ): Promise<AssertionResult> {
    const startTime = performance.now();
    const cwd = workspaceRoot ?? process.cwd();

    try {
      switch (assertion.type) {
        case "GIT_DIFF_EMPTY": {
          const { stdout } = await execAsync("git status --porcelain", { cwd });
          const isClean = stdout.trim().length === 0;
          const durationMs = performance.now() - startTime;

          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "GIT_DIFF_EMPTY",
            verdict: isClean ? "PASS" : "FAIL",
            actualValue: { modifiedFilesCount: stdout.trim().split("\n").filter(Boolean).length },
            stdout: stdout.trim(),
            errorMessage: isClean ? undefined : "Working tree has uncommitted modifications",
            executionTimeMs: Math.round(durationMs),
          };
        }

        case "GIT_BRANCH_EXISTS": {
          const { stdout } = await execAsync("git branch --list", { cwd });
          const expectedBranch = assertion.target;
          const branches = stdout.split("\n").map((b) => b.replace(/^[* ]+/, "").trim());
          const exists = branches.includes(expectedBranch);
          const durationMs = performance.now() - startTime;

          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "GIT_BRANCH_EXISTS",
            verdict: exists ? "PASS" : "FAIL",
            actualValue: { exists, branches },
            errorMessage: exists ? undefined : `Git branch '${expectedBranch}' does not exist`,
            executionTimeMs: Math.round(durationMs),
          };
        }

        case "GIT_COMMIT_PRESENT": {
          const { stdout } = await execAsync("git log -n 1 --pretty=format:%B", { cwd });
          const latestCommit = stdout.trim();
          const expectedPattern = String(assertion.expectedValue ?? "");
          const matches = latestCommit.includes(expectedPattern);
          const durationMs = performance.now() - startTime;

          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "GIT_COMMIT_PRESENT",
            verdict: matches ? "PASS" : "FAIL",
            actualValue: { latestCommit },
            errorMessage: matches ? undefined : `Latest commit message '${latestCommit}' does not match '${expectedPattern}'`,
            executionTimeMs: Math.round(durationMs),
          };
        }

        default:
          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: assertion.type,
            verdict: "INCONCLUSIVE",
            errorMessage: `Unsupported git assertion type '${assertion.type}'`,
            executionTimeMs: 0,
          };
      }
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: assertion.type,
        verdict: "FAIL",
        errorMessage: errorMsg,
        executionTimeMs: Math.round(durationMs),
      };
    }
  }
}
