import { EventEmitter } from "node:events";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

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

export class KillSwitch extends EventEmitter {
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private stoppedSessions: Set<string> = new Set();
  private stoppedAgents: Set<string> = new Set();
  private stoppedRuntimes: Set<string> = new Set();
  private stoppedTenants: Set<string> = new Set();
  private globalStop = false;
  
  private lockedWorkspaces: Set<string> = new Set();
  private revokedTokens: Set<string> = new Set();

  /**
   * Registers an AbortController for a streaming generation session.
   */
  public registerStreamController(streamId: string, controller: AbortController): void {
    this.activeAbortControllers.set(streamId, controller);
  }

  public unregisterStreamController(streamId: string): void {
    this.activeAbortControllers.delete(streamId);
  }

  /**
   * LEVEL 1: Message stream abort.
   * Immediately terminates active LLM token stream / generator.
   */
  public triggerLevel1(streamId: string, reason = "Message stream aborted by safety policy"): boolean {
    const controller = this.activeAbortControllers.get(streamId);
    if (controller) {
      controller.abort(new Error(reason));
      this.activeAbortControllers.delete(streamId);

      const event: KillSwitchEvent = {
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
  public triggerLevel2(sessionId: string, reason = "Agent session stopped by safety coordinator"): void {
    this.stoppedSessions.add(sessionId);

    // Also abort any active stream associated with this session
    this.triggerLevel1(sessionId, reason);

    const event: KillSwitchEvent = {
      level: 2,
      sessionId,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.emit("kill:level2", event);
  }

  // --- Granular Scopes (CR7) ---
  
  public stopAgent(agentId: string): void {
    this.stoppedAgents.add(agentId);
  }

  public stopRuntime(runtimeId: string): void {
    this.stoppedRuntimes.add(runtimeId);
  }

  public stopTenant(tenantId: string): void {
    this.stoppedTenants.add(tenantId);
  }

  public stopGlobal(): void {
    this.globalStop = true;
  }

  public isContextStopped(context: { sessionId?: string; agentId?: string; runtimeId?: string; tenantId?: string }): boolean {
    if (this.globalStop) return true;
    if (context.tenantId && this.stoppedTenants.has(context.tenantId)) return true;
    if (context.runtimeId && this.stoppedRuntimes.has(context.runtimeId)) return true;
    if (context.agentId && this.stoppedAgents.has(context.agentId)) return true;
    if (context.sessionId && this.stoppedSessions.has(context.sessionId)) return true;
    return false;
  }

  public isSessionStopped(sessionId: string): boolean {
    return this.isContextStopped({ sessionId });
  }

  /**
   * LEVEL 3: Emergency Runtime Termination.
   * - Kills OS child processes / PIDs
   * - Locks workspace filesystem to prevent further writes
   * - Revokes active session tokens
   */
  public async triggerLevel3(sessionId: string, reason: string, options?: Level3Options): Promise<void> {
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

    const event: KillSwitchEvent = {
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

  public isWorkspaceLocked(workspacePath: string): boolean {
    const norm = path.normalize(path.resolve(workspacePath));
    return this.lockedWorkspaces.has(norm);
  }

  public isTokenRevoked(tokenId: string): boolean {
    return this.revokedTokens.has(tokenId);
  }

  private async killProcess(pid: number): Promise<void> {
    try {
      if (process.platform === "win32") {
        await new Promise<void>((resolve) => {
          exec(`taskkill /F /T /PID ${pid}`, () => resolve());
        });
      } else {
        process.kill(pid, "SIGKILL");
      }
    } catch (err) {
      console.warn(`Could not kill process PID ${pid}:`, err);
    }
  }

  private async lockWorkspace(workspaceRoot: string): Promise<void> {
    const norm = path.normalize(path.resolve(workspaceRoot));
    this.lockedWorkspaces.add(norm);

    // Write a .synapse-locked file in the workspace
    try {
      const lockFile = path.join(norm, ".synapse-locked");
      await fs.writeFile(
        lockFile,
        JSON.stringify({
          lockedAt: new Date().toISOString(),
          reason: "Emergency kill switch Level 3 engagement",
        }, null, 2),
        "utf-8"
      );
    } catch {
      // Ignore if workspace directory does not exist
    }
  }
}
