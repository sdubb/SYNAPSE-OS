import type { ClineCore } from "@cline/core";
import { ClineExecutionError } from "../errors/ClineEngineError.js";

export interface LifecycleStopOptions {
  cline: ClineCore;
  sessionId: string;
}

export async function executeStop(options: LifecycleStopOptions): Promise<void> {
  try {
    await options.cline.stop(options.sessionId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ClineExecutionError(`Failed to stop session ${options.sessionId}: ${message}`, options.sessionId, {
      cause: err,
    });
  }
}
