import type { ClineCore, ClineCoreStartInput, StartSessionResult } from "@cline/core";
import { ClineExecutionError } from "../errors/ClineEngineError.js";

export interface LifecycleStartOptions {
  cline: ClineCore;
  input: ClineCoreStartInput;
}

export async function executeStart(options: LifecycleStartOptions): Promise<StartSessionResult> {
  try {
    const result = await options.cline.start(options.input);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ClineExecutionError(`Failed to start Cline session: ${message}`, undefined, {
      cause: err,
      prompt: options.input.prompt,
    });
  }
}
