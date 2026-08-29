import type { ClineCore } from "@cline/core";
import { ClineExecutionError } from "../errors/ClineEngineError.js";

export interface LifecycleResumeOptions {
  cline: ClineCore;
  sessionId: string;
  resumePrompt?: string;
}

export async function executeResume(options: LifecycleResumeOptions): Promise<void> {
  try {
    const prompt = options.resumePrompt || "Resume previous task execution.";
    await options.cline.send({
      sessionId: options.sessionId,
      prompt,
      delivery: "steer",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ClineExecutionError(`Failed to resume session ${options.sessionId}: ${message}`, options.sessionId, {
      cause: err,
    });
  }
}
