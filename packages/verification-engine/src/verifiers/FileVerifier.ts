import fs from "node:fs/promises";
import path from "node:path";
import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";

export class FileVerifier {
  public static async verify(
    assertion: VerificationAssertion,
    workspaceRoot?: string
  ): Promise<AssertionResult> {
    const startTime = performance.now();
    const targetPath = workspaceRoot
      ? path.resolve(workspaceRoot, assertion.target)
      : path.resolve(assertion.target);

    try {
      switch (assertion.type) {
        case "FILE_EXISTS": {
          try {
            const stat = await fs.stat(targetPath);
            const durationMs = performance.now() - startTime;
            return {
              assertionId: assertion.id,
              assertionName: assertion.name,
              type: "FILE_EXISTS",
              verdict: "PASS",
              actualValue: { exists: true, sizeBytes: stat.size },
              executionTimeMs: Math.round(durationMs),
            };
          } catch {
            const durationMs = performance.now() - startTime;
            return {
              assertionId: assertion.id,
              assertionName: assertion.name,
              type: "FILE_EXISTS",
              verdict: "FAIL",
              errorMessage: `Expected file does not exist at '${targetPath}'`,
              executionTimeMs: Math.round(durationMs),
            };
          }
        }

        case "FILE_DOES_NOT_EXIST": {
          try {
            await fs.stat(targetPath);
            const durationMs = performance.now() - startTime;
            return {
              assertionId: assertion.id,
              assertionName: assertion.name,
              type: "FILE_DOES_NOT_EXIST",
              verdict: "FAIL",
              errorMessage: `File was expected NOT to exist, but was found at '${targetPath}'`,
              executionTimeMs: Math.round(durationMs),
            };
          } catch {
            const durationMs = performance.now() - startTime;
            return {
              assertionId: assertion.id,
              assertionName: assertion.name,
              type: "FILE_DOES_NOT_EXIST",
              verdict: "PASS",
              actualValue: { exists: false },
              executionTimeMs: Math.round(durationMs),
            };
          }
        }

        case "FILE_CONTAINS": {
          const content = await fs.readFile(targetPath, "utf-8");
          const expected = String(assertion.expectedValue ?? "");
          const isContained = content.includes(expected);
          const durationMs = performance.now() - startTime;

          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "FILE_CONTAINS",
            verdict: isContained ? "PASS" : "FAIL",
            actualValue: { contains: isContained },
            errorMessage: isContained ? undefined : `File '${targetPath}' does not contain expected snippet`,
            executionTimeMs: Math.round(durationMs),
          };
        }

        case "FILE_EQUALS": {
          const content = await fs.readFile(targetPath, "utf-8");
          const expected = String(assertion.expectedValue ?? "");
          const isEquals = content.trim() === expected.trim();
          const durationMs = performance.now() - startTime;

          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: "FILE_EQUALS",
            verdict: isEquals ? "PASS" : "FAIL",
            errorMessage: isEquals ? undefined : `File '${targetPath}' content differs from expected content`,
            executionTimeMs: Math.round(durationMs),
          };
        }

        default:
          return {
            assertionId: assertion.id,
            assertionName: assertion.name,
            type: assertion.type,
            verdict: "INCONCLUSIVE",
            errorMessage: `Unsupported file assertion type '${assertion.type}'`,
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
