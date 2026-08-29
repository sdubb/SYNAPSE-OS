import * as fs from "node:fs/promises";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ClineWorkspaceError } from "./errors/ClineEngineError.js";

const execAsync = promisify(exec);

export interface WorkspaceConfig {
  workspaceId: string;
  tenantId: string;
  baseDirectory: string;
  isSandboxed?: boolean;
}

export class ClineWorkspace {
  readonly workspaceId: string;
  readonly tenantId: string;
  readonly rootPath: string;
  readonly isSandboxed: boolean;
  private activeWorktrees = new Set<string>();

  constructor(config: WorkspaceConfig) {
    this.workspaceId = config.workspaceId;
    this.tenantId = config.tenantId;
    this.isSandboxed = config.isSandboxed ?? true;
    this.rootPath = path.resolve(config.baseDirectory, config.tenantId, config.workspaceId);
  }

  /**
   * Ensure workspace root directory exists and is initialized.
   */
  async initialize(): Promise<string> {
    try {
      await fs.mkdir(this.rootPath, { recursive: true });
      return this.rootPath;
    } catch (err: unknown) {
      throw new ClineWorkspaceError(
        `Failed to initialize workspace directory '${this.rootPath}': ${err instanceof Error ? err.message : String(err)}`,
        this.rootPath
      );
    }
  }

  /**
   * Validate that a target relative or absolute path is strictly contained within the workspace root.
   */
  resolveSafePath(targetRelativeOrAbsolutePath: string): string {
    const resolved = path.isAbsolute(targetRelativeOrAbsolutePath)
      ? path.resolve(targetRelativeOrAbsolutePath)
      : path.resolve(this.rootPath, targetRelativeOrAbsolutePath);

    const relative = path.relative(this.rootPath, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new ClineWorkspaceError(
        `Path traversal violation: '${targetRelativeOrAbsolutePath}' resolves outside workspace boundary '${this.rootPath}'.`,
        this.rootPath
      );
    }

    return resolved;
  }

  /**
   * Create an isolated Git worktree for parallel agent execution.
   */
  async createWorktree(branchName: string, worktreeId = crypto.randomUUID()): Promise<string> {
    const worktreePath = path.join(this.rootPath, ".worktrees", worktreeId);
    try {
      await fs.mkdir(path.dirname(worktreePath), { recursive: true });
      // Execute git worktree add
      await execAsync(`git worktree add "${worktreePath}" -B "${branchName}"`, {
        cwd: this.rootPath,
      });
      this.activeWorktrees.add(worktreePath);
      return worktreePath;
    } catch (err: unknown) {
      throw new ClineWorkspaceError(
        `Failed to create git worktree at '${worktreePath}': ${err instanceof Error ? err.message : String(err)}`,
        worktreePath
      );
    }
  }

  /**
   * Remove a Git worktree.
   */
  async removeWorktree(worktreePath: string): Promise<void> {
    try {
      await execAsync(`git worktree remove --force "${worktreePath}"`, {
        cwd: this.rootPath,
      });
      this.activeWorktrees.delete(worktreePath);
    } catch (err: unknown) {
      console.warn(`[ClineWorkspace] Worktree removal warning for ${worktreePath}:`, err);
    }
  }

  /**
   * Cleanup entire workspace or sandbox resources.
   */
  async cleanup(): Promise<void> {
    for (const wt of this.activeWorktrees) {
      await this.removeWorktree(wt);
    }
    this.activeWorktrees.clear();
  }
}
