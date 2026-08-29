export class ClineEngineError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly sessionId?: string;

  constructor(message: string, options?: { code?: string; details?: Record<string, unknown>; sessionId?: string; cause?: unknown }) {
    super(message);
    this.name = "ClineEngineError";
    this.code = options?.code ?? "CLINE_ENGINE_ERROR";
    this.details = options?.details;
    this.sessionId = options?.sessionId;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export class ClineSessionNotFoundError extends ClineEngineError {
  constructor(sessionId: string) {
    super(`Cline session '${sessionId}' was not found or is no longer active.`, {
      code: "SESSION_NOT_FOUND",
      sessionId,
    });
    this.name = "ClineSessionNotFoundError";
  }
}

export class ClineExecutionError extends ClineEngineError {
  constructor(message: string, sessionId?: string, details?: Record<string, unknown>) {
    super(message, {
      code: "EXECUTION_FAILED",
      sessionId,
      details,
    });
    this.name = "ClineExecutionError";
  }
}

export class ClineApprovalTimeoutError extends ClineEngineError {
  constructor(callId: string, sessionId: string) {
    super(`Tool approval request for call '${callId}' in session '${sessionId}' timed out.`, {
      code: "APPROVAL_TIMEOUT",
      sessionId,
      details: { callId },
    });
    this.name = "ClineApprovalTimeoutError";
  }
}

export class ClineCheckpointError extends ClineEngineError {
  constructor(message: string, sessionId: string, checkpointId?: string) {
    super(message, {
      code: "CHECKPOINT_ERROR",
      sessionId,
      details: { checkpointId },
    });
    this.name = "ClineCheckpointError";
  }
}

export class ClineWorkspaceError extends ClineEngineError {
  constructor(message: string, workspacePath?: string) {
    super(message, {
      code: "WORKSPACE_ERROR",
      details: { workspacePath },
    });
    this.name = "ClineWorkspaceError";
  }
}

export class ClineTeamError extends ClineEngineError {
  constructor(message: string, teamName?: string) {
    super(message, {
      code: "TEAM_ERROR",
      details: { teamName },
    });
    this.name = "ClineTeamError";
  }
}
