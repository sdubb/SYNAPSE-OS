/**
 * @file TwinEngine.ts
 * @description Master orchestrator coordinating active Digital Twins representing real-world systems, lifecycle, synchronization, and historical replay.
 */

import { DigitalTwin, type DigitalTwinConfig } from './DigitalTwin.js';
import { TwinSynchronizer, type TelemetryPacket, type SyncReport } from './TwinSynchronizer.js';
import { TwinDiff, type TwinDiffResult } from './TwinDiff.js';
import { TwinSnapshot } from './TwinSnapshot.js';
import { TwinBuilder } from './TwinBuilder.js';

export interface TwinEngineConfig {
  readonly defaultTenantId?: string;
  readonly autoSnapshotIntervalMs?: number;
}

export class TwinEngine {
  private readonly _twins: Map<string, DigitalTwin> = new Map();
  private readonly _synchronizer: TwinSynchronizer;
  private readonly _config: Required<TwinEngineConfig>;
  private _autoSnapshotTimer?: NodeJS.Timeout;

  constructor(config: TwinEngineConfig = {}) {
    this._config = {
      defaultTenantId: config.defaultTenantId ?? 'default-tenant',
      autoSnapshotIntervalMs: config.autoSnapshotIntervalMs ?? 0, // 0 = disabled by default
    };
    this._synchronizer = new TwinSynchronizer();

    if (this._config.autoSnapshotIntervalMs > 0) {
      this.startAutoSnapshots();
    }
  }

  public get synchronizer(): TwinSynchronizer {
    return this._synchronizer;
  }

  public createTwinBuilder(): TwinBuilder {
    return new TwinBuilder().withTenant(this._config.defaultTenantId);
  }

  /**
   * Registers a digital twin in the engine.
   */
  public registerTwin(twin: DigitalTwin): void {
    if (this._twins.has(twin.id)) {
      throw new Error(`DigitalTwin with id '${twin.id}' is already registered.`);
    }
    this._twins.set(twin.id, twin);
  }

  /**
   * Creates and registers a new Digital Twin.
   */
  public createTwin(config: DigitalTwinConfig): DigitalTwin {
    const twin = new DigitalTwin(config);
    this.registerTwin(twin);
    return twin;
  }

  public getTwin(twinId: string): DigitalTwin | undefined {
    return this._twins.get(twinId);
  }

  public getAllTwins(): DigitalTwin[] {
    return Array.from(this._twins.values());
  }

  public getTwinsForTenant(tenantId: string): DigitalTwin[] {
    const results: DigitalTwin[] = [];
    for (const t of this._twins.values()) {
      if (t.tenantId === tenantId) {
        results.push(t);
      }
    }
    return results;
  }

  public unregisterTwin(twinId: string): boolean {
    return this._twins.delete(twinId);
  }

  /**
   * Ingests telemetry packets and synchronizes the target Digital Twin.
   */
  public syncTelemetry(twinId: string, packets: readonly TelemetryPacket[]): SyncReport {
    const twin = this.requireTwin(twinId);
    return this._synchronizer.sync(twin, packets);
  }

  /**
   * Captures a manual point-in-time snapshot of the twin.
   */
  public snapshotTwin(twinId: string, reason?: string, label?: string): TwinSnapshot {
    const twin = this.requireTwin(twinId);
    return twin.createSnapshot(reason, label);
  }

  /**
   * Replays and restores twin state to a snapshot ("Time Machine").
   */
  public restoreSnapshot(twinId: string, snapshotId: string): boolean {
    const twin = this.requireTwin(twinId);
    return twin.restoreSnapshot(snapshotId);
  }

  /**
   * Computes differences between two snapshots of a twin or between two different twins.
   */
  public diffSnapshots(baseSnapshot: TwinSnapshot, targetSnapshot: TwinSnapshot): TwinDiffResult {
    return TwinDiff.compareSnapshots(baseSnapshot, targetSnapshot);
  }

  /**
   * Clones an active Digital Twin to create an isolated simulation fork.
   */
  public forkTwin(twinId: string, forkId: string, forkName?: string): DigitalTwin {
    const twin = this.requireTwin(twinId);
    const forked = twin.fork(forkId, forkName);
    this.registerTwin(forked);
    return forked;
  }

  public destroy(): void {
    if (this._autoSnapshotTimer) {
      clearInterval(this._autoSnapshotTimer);
    }
  }

  private startAutoSnapshots(): void {
    this._autoSnapshotTimer = setInterval(() => {
      for (const twin of this._twins.values()) {
        twin.createSnapshot('Periodic auto-snapshot');
      }
    }, this._config.autoSnapshotIntervalMs);
  }

  private requireTwin(twinId: string): DigitalTwin {
    const twin = this._twins.get(twinId);
    if (!twin) {
      throw new Error(`DigitalTwin with id '${twinId}' not found.`);
    }
    return twin;
  }
}
