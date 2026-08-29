import { EventEmitter } from "node:events";
export type KillSwitchLevel = 1 | 2 | 3;
export interface KillSwitchEvent {
    level: KillSwitchLevel;
    sessionId: string;
    tenantId?: string;
    reason: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}
export interface Level3Options {
    tenantId?: string;
    pidsToKill?: number[];
    workspaceRoot?: string;
    revokeSessionTokens?: boolean;
}
export declare class KillSwitch extends EventEmitter {
    private activeAbortControllers;
    private stoppedSessions;
    private lockedWorkspaces;
    private revokedTokens;
    /**
     * Registers an AbortController for a streaming generation session.
     */
    registerStreamController(streamId: string, controller: AbortController): void;
    unregisterStreamController(streamId: string): void;
    /**
     * LEVEL 1: Message stream abort.
     * Immediately terminates active LLM token stream / generator.
     */
    triggerLevel1(streamId: string, reason?: string): boolean;
    /**
     * LEVEL 2: Session graceful stop.
     * Halts the active agent session, cancels pending tool invocations, and marks session as stopped.
     */
    triggerLevel2(sessionId: string, reason?: string): void;
    isSessionStopped(sessionId: string): boolean;
    /**
     * LEVEL 3: Emergency Runtime Termination.
     * - Kills OS child processes / PIDs
     * - Locks workspace filesystem to prevent further writes
     * - Revokes active session tokens
     */
    triggerLevel3(sessionId: string, reason: string, options?: Level3Options): Promise<void>;
    isWorkspaceLocked(workspacePath: string): boolean;
    isTokenRevoked(tokenId: string): boolean;
    private killProcess;
    private lockWorkspace;
}
//# sourceMappingURL=KillSwitch.d.ts.map