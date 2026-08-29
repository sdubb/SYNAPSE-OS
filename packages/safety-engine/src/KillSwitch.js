import { EventEmitter } from "node:events";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
export class KillSwitch extends EventEmitter {
    activeAbortControllers = new Map();
    stoppedSessions = new Set();
    lockedWorkspaces = new Set();
    revokedTokens = new Set();
    /**
     * Registers an AbortController for a streaming generation session.
     */
    registerStreamController(streamId, controller) {
        this.activeAbortControllers.set(streamId, controller);
    }
    unregisterStreamController(streamId) {
        this.activeAbortControllers.delete(streamId);
    }
    /**
     * LEVEL 1: Message stream abort.
     * Immediately terminates active LLM token stream / generator.
     */
    triggerLevel1(streamId, reason = "Message stream aborted by safety policy") {
        const controller = this.activeAbortControllers.get(streamId);
        if (controller) {
            controller.abort(new Error(reason));
            this.activeAbortControllers.delete(streamId);
            const event = {
                level: 1,
                sessionId: streamId,
                reason,
                timestamp: new Date().toISOString(),
            };
            this.emit("kill:level1", event);
            return true;
        }
        return false;
    }
    /**
     * LEVEL 2: Session graceful stop.
     * Halts the active agent session, cancels pending tool invocations, and marks session as stopped.
     */
    triggerLevel2(sessionId, reason = "Agent session stopped by safety coordinator") {
        this.stoppedSessions.add(sessionId);
        // Also abort any active stream associated with this session
        this.triggerLevel1(sessionId, reason);
        const event = {
            level: 2,
            sessionId,
            reason,
            timestamp: new Date().toISOString(),
        };
        this.emit("kill:level2", event);
    }
    isSessionStopped(sessionId) {
        return this.stoppedSessions.has(sessionId);
    }
    /**
     * LEVEL 3: Emergency Runtime Termination.
     * - Kills OS child processes / PIDs
     * - Locks workspace filesystem to prevent further writes
     * - Revokes active session tokens
     */
    async triggerLevel3(sessionId, reason, options) {
        // 1. Trigger Level 2 stop first
        this.triggerLevel2(sessionId, reason);
        // 2. Kill registered child processes / PIDs
        if (options?.pidsToKill && options.pidsToKill.length > 0) {
            for (const pid of options.pidsToKill) {
                await this.killProcess(pid);
            }
        }
        // 3. Lock workspace filesystem
        if (options?.workspaceRoot) {
            await this.lockWorkspace(options.workspaceRoot);
        }
        // 4. Invalidate tokens
        if (options?.revokeSessionTokens) {
            this.revokedTokens.add(sessionId);
        }
        const event = {
            level: 3,
            sessionId,
            tenantId: options?.tenantId,
            reason,
            timestamp: new Date().toISOString(),
            metadata: {
                killedPids: options?.pidsToKill,
                lockedWorkspace: options?.workspaceRoot,
            },
        };
        this.emit("kill:level3", event);
    }
    isWorkspaceLocked(workspacePath) {
        const norm = path.normalize(path.resolve(workspacePath));
        return this.lockedWorkspaces.has(norm);
    }
    isTokenRevoked(tokenId) {
        return this.revokedTokens.has(tokenId);
    }
    async killProcess(pid) {
        try {
            if (process.platform === "win32") {
                await new Promise((resolve) => {
                    exec(`taskkill /F /T /PID ${pid}`, () => resolve());
                });
            }
            else {
                process.kill(pid, "SIGKILL");
            }
        }
        catch (err) {
            console.warn(`Could not kill process PID ${pid}:`, err);
        }
    }
    async lockWorkspace(workspaceRoot) {
        const norm = path.normalize(path.resolve(workspaceRoot));
        this.lockedWorkspaces.add(norm);
        // Write a .synapse-locked file in the workspace
        try {
            const lockFile = path.join(norm, ".synapse-locked");
            await fs.writeFile(lockFile, JSON.stringify({
                lockedAt: new Date().toISOString(),
                reason: "Emergency kill switch Level 3 engagement",
            }, null, 2), "utf-8");
        }
        catch {
            // Ignore if workspace directory does not exist
        }
    }
}
//# sourceMappingURL=KillSwitch.js.map