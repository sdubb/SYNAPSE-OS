import {
  type VerificationAssertion,
  type AssertionResult,
} from "@synapse/contracts";

export class APIVerifier {
  public static async verify(assertion: VerificationAssertion): Promise<AssertionResult> {
    const startTime = performance.now();
    const url = assertion.target;
    const method = (assertion.metadata["method"] as string) ?? "GET";
    const expectedStatus = Number(assertion.expectedValue ?? 200);
    const timeoutMs = (assertion.timeoutSeconds ?? 10) * 1000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: (assertion.metadata["headers"] as Record<string, string>) ?? {},
        body: assertion.metadata["body"] ? JSON.stringify(assertion.metadata["body"]) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = performance.now() - startTime;
      const responseText = await response.text();

      const isStatusOk = response.status === expectedStatus;

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "HTTP_STATUS_OK",
        verdict: isStatusOk ? "PASS" : "FAIL",
        actualValue: {
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(durationMs),
          headers: Object.fromEntries(response.headers.entries()),
          bodySnippet: responseText.slice(0, 500),
        },
        errorMessage: isStatusOk ? undefined : `Expected HTTP status ${expectedStatus}, received ${response.status}`,
        executionTimeMs: Math.round(durationMs),
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      return {
        assertionId: assertion.id,
        assertionName: assertion.name,
        type: "HTTP_STATUS_OK",
        verdict: "FAIL",
        errorMessage: `HTTP probe failed: ${errorMsg}`,
        executionTimeMs: Math.round(durationMs),
      };
    }
  }
}
