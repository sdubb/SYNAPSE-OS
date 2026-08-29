/**
 * @file WorkspaceController.ts
 * @description Workspace lifecycle controller for directory provisioning, permission locks, snapshotting, and cleanup.
 */

import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { WorkspaceProvisioningError, LockAcquisitionError } from './errors/ControlPlaneError.js';

export type WorkspaceLockMode = 'READ_ONLY' | 'READ_WRITE' | 'EXCLUSIVE';

export interface WorkspaceLockRecord {
  readonly lockId: string;
  readonly workspacePath: string;
  readonly holderId: string;
  readonly mode: WorkspaceLockMode;
  readonly acquiredAt: Date;
  readonly leaseExpiresAt: Date;
}

export interface WorkspaceSnapshot {
  readonly snapshotId: string;
  readonly workspacePath: string;
  readonly fileCount: number;
  readonly totalSizeBytes: number;
  readonly fileManifest: readonly { relativePath: string; sizeBytes: number; modifiedAt: Date }[];
  readonly createdAt: Date;
}

export interface ProvisionWorkspaceOptions {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly baseDirectory: string;
  readonly initialFiles?: Record<string, string>;
  readonly isTemporary?: boolean;
}

export interface ActiveWorkspace {
  readonly workspacePath: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly isTemporary: boolean;
  readonly createdAt: Date;
}

export class WorkspaceController extends EventEmitter {
  private readonly workspaces: Map<string, ActiveWorkspace> = new Map();
  private readonly locks: Map<string, WorkspaceLockRecord> = new Map();
  private readonly snapshots: Map<string, WorkspaceSnapshot[]> = new Map();

  constructor() {
    super();
  }

  public async provisionWorkspace(options: ProvisionWorkspaceOptions): Promise<string> {
    const targetDir = path.resolve(
      options.baseDirectory,
      `tenant_${options.tenantId}`,
      `sess_${options.sessionId}`
    );

    try {
      await fs.mkdir(targetDir, { recursive: true });

      // Create .synapse directory for metadata
      const metaDir = path.join(targetDir, '.synapse');
      await fs.mkdir(metaDir, { recursive: true });

      // Write initial files if provided
      if (options.initialFiles) {
        for (const [relPath, content] of Object.entries(options.initialFiles)) {
          const filePath = path.join(targetDir, relPath);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content, 'utf8');
        }
      }

      const active: ActiveWorkspace = {
        workspacePath: targetDir,
        tenantId: options.tenantId,
        sessionId: options.sessionId,
        taskId: options.taskId,
        isTemporary: !!options.isTemporary,
        createdAt: new Date(),
      };

      this.workspaces.set(targetDir, active);
      this.emit('workspace_provisioned', active);
      return targetDir;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new WorkspaceProvisioningError(targetDir, errorMsg, {
        tenantId: options.tenantId,
        sessionId: options.sessionId,
        taskId: options.taskId,
      });
    }
  }

  public acquireLock(
    workspacePath: string,
    holderId: string,
    mode: WorkspaceLockMode = 'EXCLUSIVE',
    leaseDurationMs: number = 60_000
  ): WorkspaceLockRecord {
    const normalized = path.resolve(workspacePath);
    const existing = this.locks.get(normalized);
    const now = Date.now();

    if (existing && existing.leaseExpiresAt.getTime() > now) {
      if (existing.holderId !== holderId) {
        throw new LockAcquisitionError(normalized, existing.holderId, {
          details: { requestedBy: holderId, existingMode: existing.mode },
        });
      }
    }

    const lockId = `lock-${now}-${Math.random().toString(36).substring(2, 7)}`;
    const lock: WorkspaceLockRecord = {
      lockId,
      workspacePath: normalized,
      holderId,
      mode,
      acquiredAt: new Date(now),
      leaseExpiresAt: new Date(now + leaseDurationMs),
    };

    this.locks.set(normalized, lock);
    this.emit('lock_acquired', lock);
    return lock;
  }

  public releaseLock(workspacePath: string, holderId: string): boolean {
    const normalized = path.resolve(workspacePath);
    const existing = this.locks.get(normalized);

    if (!existing) {
      return false;
    }

    if (existing.holderId !== holderId) {
      return false;
    }

    this.locks.delete(normalized);
    this.emit('lock_released', { workspacePath: normalized, holderId });
    return true;
  }

  public async createSnapshot(workspacePath: string): Promise<WorkspaceSnapshot> {
    const normalized = path.resolve(workspacePath);
    const manifest: Array<{ relativePath: string; sizeBytes: number; modifiedAt: Date }> = [];
    let totalSize = 0;

    const scanDirectory = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.name === '.git' || entry.name === '.synapse' || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const relPath = path.relative(normalized, fullPath).replace(/\\/g, '/');
          manifest.push({
            relativePath: relPath,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime,
          });
          totalSize += stats.size;
        }
      }
    };

    try {
      await scanDirectory(normalized);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to take snapshot of '${normalized}': ${errorMsg}`);
    }

    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const snapshot: WorkspaceSnapshot = {
      snapshotId,
      workspacePath: normalized,
      fileCount: manifest.length,
      totalSizeBytes: totalSize,
      fileManifest: Object.freeze(manifest),
      createdAt: new Date(),
    };

    if (!this.snapshots.has(normalized)) {
      this.snapshots.set(normalized, []);
    }
    this.snapshots.get(normalized)!.push(snapshot);

    this.emit('snapshot_created', snapshot);
    return snapshot;
  }

  public getSnapshots(workspacePath: string): readonly WorkspaceSnapshot[] {
    const normalized = path.resolve(workspacePath);
    return Object.freeze(this.snapshots.get(normalized) ?? []);
  }

  public async cleanupWorkspace(workspacePath: string, force: boolean = false): Promise<boolean> {
    const normalized = path.resolve(workspacePath);
    const existing = this.locks.get(normalized);

    if (existing && !force && existing.leaseExpiresAt.getTime() > Date.now()) {
      throw new Error(`Cannot cleanup workspace '${normalized}': locked by holder '${existing.holderId}'`);
    }

    this.locks.delete(normalized);
    this.workspaces.delete(normalized);
    this.snapshots.delete(normalized);

    try {
      await fs.rm(normalized, { recursive: true, force: true });
      this.emit('workspace_cleaned', { workspacePath: normalized });
      return true;
    } catch {
      return false;
    }
  }

  public getWorkspace(workspacePath: string): ActiveWorkspace | undefined {
    return this.workspaces.get(path.resolve(workspacePath));
  }

  public listActiveWorkspaces(tenantId?: string): readonly ActiveWorkspace[] {
    const list: ActiveWorkspace[] = [];
    for (const ws of this.workspaces.values()) {
      if (!tenantId || ws.tenantId === tenantId) {
        list.push(ws);
      }
    }
    return Object.freeze(list);
  }
}
