import {
  type VerificationPlan,
  type VerificationRun,
  type AssertionResult,
  type VerificationVerdict,
} from "@synapse/contracts";
import {
  FileVerifier,
  GitVerifier,
  TestVerifier,
  BuildVerifier,
  APIVerifier,
  DatabaseVerifier,
  SecurityVerifier,
  VerifierAgent,
  type DatabaseQueryExecutor,
} from "./verifiers/index.js";

export interface VerificationRunnerOptions {
  workspaceRoot?: string;
  dbExecutor?: DatabaseQueryExecutor;
  stopOnFirstCriticalFailure?: boolean;
}

export class VerificationRunner {
  /**
   * Executes a complete verification plan assertion pipeline and produces a sealed VerificationRun report.
   */
  public static async execute(
    plan: VerificationPlan,
    options?: VerificationRunnerOptions
  ): Promise<VerificationRun> {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const assertionResults: AssertionResult[] = [];
    let hasCriticalFailure = false;
    let hasAnyFailure = false;

    for (const assertion of plan.assertions) {
      if (hasCriticalFailure && options?.stopOnFirstCriticalFailure) {
        assertionResults.push({
          assertionId: assertion.id,
          assertionName: assertion.name,
          type: assertion.type,
          verdict: "SKIPPED",
          errorMessage: "Skipped due to prior critical assertion failure",
          executionTimeMs: 0,
        });
        continue;
      }

      let result: AssertionResult;

      try {
        switch (assertion.type) {
          case "FILE_EXISTS":
          case "FILE_DOES_NOT_EXIST":
          case "FILE_CONTAINS":
          case "FILE_EQUALS":
            result = await FileVerifier.verify(assertion, options?.workspaceRoot);
            break;

          case "GIT_DIFF_EMPTY":
          case "GIT_BRANCH_EXISTS":
          case "GIT_COMMIT_PRESENT":
            result = await GitVerifier.verify(assertion, options?.workspaceRoot);
            break;

          case "TEST_SUITE_PASS":
            result = await TestVerifier.verify(assertion, options?.workspaceRoot);
            break;

          case "BUILD_SUCCESS":
            result = await BuildVerifier.verify(assertion, options?.workspaceRoot);
            break;

          case "HTTP_STATUS_OK":
            result = await APIVerifier.verify(assertion);
            break;

          case "COMMAND_EXIT_ZERO":
          case "COMMAND_OUTPUT_MATCHES":
            result = await DatabaseVerifier.verify(assertion, options?.dbExecutor);
            break;

          case "SECURITY_SCAN_CLEAN":
            result = await SecurityVerifier.verify(assertion, options?.workspaceRoot);
            break;

          case "AGENT_EVALUATION":
            result = await VerifierAgent.verify(assertion);
            break;

          default:
            result = {
              assertionId: assertion.id,
              assertionName: assertion.name,
              type: assertion.type,
              verdict: "INCONCLUSIVE",
              errorMessage: `Unrecognized assertion type: ${assertion.type}`,
              executionTimeMs: 0,
            };
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result = {
          assertionId: assertion.id,
          assertionName: assertion.name,
          type: assertion.type,
          verdict: "FAIL",
          errorMessage: `Unhandled runner error: ${errorMsg}`,
          executionTimeMs: 0,
        };
      }

      assertionResults.push(result);

      if (result.verdict === "FAIL") {
        hasAnyFailure = true;
        if (assertion.critical) {
          hasCriticalFailure = true;
        }
      }
    }

    // Determine overall verdict
    let overallVerdict: VerificationVerdict = "PASS";
    if (hasCriticalFailure || hasAnyFailure) {
      overallVerdict = "FAIL";
    } else if (assertionResults.some((r) => r.verdict === "INCONCLUSIVE")) {
      overallVerdict = "INCONCLUSIVE";
    }

    const passedCount = assertionResults.filter((r) => r.verdict === "PASS").length;
    const failedCount = assertionResults.filter((r) => r.verdict === "FAIL").length;
    const summary = `${overallVerdict}: ${passedCount} passed, ${failedCount} failed out of ${assertionResults.length} assertions.`;

    const completedAt = new Date().toISOString();

    return {
      id: runId as `${string}-${string}-${string}-${string}-${string}`,
      tenantId: plan.tenantId,
      planId: plan.id,
      taskId: plan.taskId,
      overallVerdict,
      assertionResults,
      summary,
      startedAt,
      completedAt,
    };
  }
}
