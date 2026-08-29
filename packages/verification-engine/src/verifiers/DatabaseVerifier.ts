import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";

export interface DatabaseQueryExecutor {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
}

export class DatabaseVerifier {
  public static async verify(
    assertion: VerificationAssertion,
    executor?: DatabaseQueryExecutor
  ): Promise<AssertionResult> {
    const startTime = performance.now();
    const sql = assertion.target;

    if (!executor) {
      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "COMMAND_EXIT_ZERO",
        verdict: "SKIPPED",
        errorMessage: "No database query executor provided for verification assertion",
        executionTimeMs: 0,
      };
    }

    try {
      const rows = await executor.query(sql);
      const durationMs = performance.now() - startTime;
      const expectedRowCount = assertion.metadata["expectedRowCount"] as number | undefined;

      let verdict: "PASS" | "FAIL" = "PASS";
      let errorMessage: string | undefined;

      if (expectedRowCount !== undefined && rows.length !== expectedRowCount) {
        verdict = "FAIL";
        errorMessage = `Expected ${expectedRowCount} rows, but query returned ${rows.length} rows`;
      }

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "COMMAND_EXIT_ZERO",
        verdict,
        actualValue: { rowCount: rows.length, firstRow: rows[0] },
        errorMessage,
        executionTimeMs: Math.round(durationMs),
      };
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "COMMAND_EXIT_ZERO",
        verdict: "FAIL",
        errorMessage: `Database verification query error: ${errorMsg}`,
        executionTimeMs: Math.round(durationMs),
      };
    }
  }
}
