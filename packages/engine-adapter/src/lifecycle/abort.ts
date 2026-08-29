import type { ClineCore } from "@cline/core";
import { ClineExecutionError } from "../errors/ClineEngineError.js";

export interface LifecycleAbortOptions {
  cline: ClineCore;
  sessionId: string;
}

export async function executeAbort(options: LifecycleAbortOptions): Promise<void> {
  try {
    await options.cline.abort(options.sessionId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ClineExecutionError(`Failed to abort session ${options.sessionId}: ${message}`, options.sessionId, {
      cause: err,
    });
  }
}
