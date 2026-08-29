import type { ClineCore, ClineCoreStartInput, StartSessionResult } from "@cline/core";
import { ClineExecutionError } from "../errors/ClineEngineError.js";
import { executeAbort } from "./abort.js";
import { executeStart } from "./start.js";

export interface LifecycleRestartOptions {
  cline: ClineCore;
  sessionId: string;
  startInput: ClineCoreStartInput;
}

export async function executeRestart(options: LifecycleRestartOptions): Promise<StartSessionResult> {
  try {
    // 1. Abort existing session if running
    try {
      await executeAbort({ cline: options.cline, sessionId: options.sessionId });
    } catch {
      // Ignore if already stopped/aborted
    }

    // 2. Start new session
    return await executeStart({
      cline: options.cline,
      input: options.startInput,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ClineExecutionError(`Failed to restart session ${options.sessionId}: ${message}`, options.sessionId, {
      cause: err,
    });
  }
}
