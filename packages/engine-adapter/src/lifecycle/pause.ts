import type { ClineCore } from "@cline/core";
import { ClineExecutionError } from "../errors/ClineEngineError.js";

export interface LifecyclePauseOptions {
  cline: ClineCore;
  sessionId: string;
}

export async function executePause(options: LifecyclePauseOptions): Promise<void> {
  try {
    // In Cline Core, pausing active generation is handled by stopping current turn or signaling wait
    await options.cline.stop(options.sessionId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ClineExecutionError(`Failed to pause session ${options.sessionId}: ${message}`, options.sessionId, {
      cause: err,
    });
  }
}
