/**
 * @file DigitalTwin.ts
 * @description Concrete Digital Twin runtime representation linking live state, historical snapshots ("Time Machine"), and confidence metrics.
 */

import { WorldModel, Entity, Relationship, type PropertyValue } from '@synapse/world-engine';
import { TwinSnapshot } from './TwinSnapshot.js';
import { TwinConfidence, type ConfidenceScoreBreakdown, type ModelAssumption } from './TwinConfidence.js';

export interface DigitalTwinConfig {
  readonly id: string;
  readonly name: string;
  readonly targetSystemId: string;
  readonly primarySourceSystem: string;
  readonly tenantId: string;
  readonly description?: string;
  readonly baselineModel: WorldModel;
  readonly assumptions?: readonly ModelAssumption[];
  readonly maxSnapshotHistory?: number;
}

export class DigitalTwin {
  public readonly id: string;
  public readonly name: string;
  public readonly targetSystemId: string;
  public readonly primarySourceSystem: string;
  public readonly tenantId: string;
  public readonly description?: string;

  private _currentModel: WorldModel;
  private _version: number;
  private _lastTelemetryTimestamp: number;
  private _assumptions: ModelAssumption[];
  private readonly _snapshots: TwinSnapshot[] = [];
  private readonly _maxSnapshotHistory: number;

  constructor(config: DigitalTwinConfig) {
    this.id = config.id;
    this.name = config.name;
    this.targetSystemId = config.targetSystemId;
    this.primarySourceSystem = config.primarySourceSystem;
    this.tenantId = config.tenantId;
    this.description = config.description;

    this._currentModel = config.baselineModel;
    this._version = 1;
    this._lastTelemetryTimestamp = Date.now();
    this._assumptions = config.assumptions ? [...config.assumptions] : [];
    this._maxSnapshotHistory = config.maxSnapshotHistory ?? 50;

    // Capture initial snapshot
    this.createSnapshot('Initial baseline creation');
  }

  public get model(): WorldModel {
    return this._currentModel;
  }

  public get version(): number {
    return this._version;
  }

  public get lastTelemetryTimestamp(): number {
    return this._lastTelemetryTimestamp;
  }

  public get assumptions(): readonly ModelAssumption[] {
    return this._assumptions;
  }

  public get snapshots(): readonly TwinSnapshot[] {
    return this._snapshots;
  }

  /**
   * Computes the current real-time confidence breakdown.
   */
  public getConfidence(): ConfidenceScoreBreakdown {
    const allEntities = this._currentModel.getAllEntities();
    let totalObservedProps = 0;
    for (const e of allEntities) {
      totalObservedProps += Object.keys(e.properties).length;
    }

    const expectedProps = Math.max(1, allEntities.length * 5); // Baseline expected properties

    return TwinConfidence.evaluate({
      lastTelemetryTimestamp: this._lastTelemetryTimestamp,
      primarySourceSystem: this.primarySourceSystem,
      expectedPropertyCount: expectedProps,
      observedPropertyCount: totalObservedProps,
      assumptions: this._assumptions,
    });
  }

  /**
   * Updates state from incoming telemetry.
   */
  public applyTelemetry(
    updates: Array<{ entityId: string; stateDelta: Record<string, PropertyValue> }>,
    telemetryTimestamp = Date.now()
  ): void {
    let updatedModel = this._currentModel;

    for (const update of updates) {
      const entity = updatedModel.getEntity(update.entityId);
      if (entity) {
        const updatedEntity = entity.cloneWithState(update.stateDelta, {
          sourceSystem: this.primarySourceSystem,
          updatedAt: telemetryTimestamp,
        });
        updatedModel = updatedModel.withEntity(updatedEntity);
      }
    }

    this._currentModel = updatedModel;
    this._version++;
    this._lastTelemetryTimestamp = telemetryTimestamp;
  }

  /**
   * Captures a point-in-time snapshot for the Time Machine.
   */
  public createSnapshot(reason?: string, label?: string): TwinSnapshot {
    const entityStates: Record<string, Record<string, PropertyValue>> = {};
    for (const entity of this._currentModel.getAllEntities()) {
      entityStates[entity.id] = { ...entity.properties };
    }

    const relationships = this._currentModel.getAllRelationships().map((r: Relationship) => ({
      id: r.id,
      sourceId: r.sourceId,
      targetId: r.targetId,
      relationType: r.relationType,
      weight: r.weight,
      attributes: { ...r.attributes },
    }));

    const snapshot = new TwinSnapshot({
      snapshotId: `snap_${this.id}_v${this._version}_${Date.now()}`,
      twinId: this.id,
      version: this._version,
      timestamp: Date.now(),
      label,
      reason,
      entityStates,
      relationships,
      confidence: this.getConfidence(),
    });

    this._snapshots.push(snapshot);
    if (this._snapshots.length > this._maxSnapshotHistory) {
      this._snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Replays and restores state to a historical snapshot ("Time Machine").
   */
  public restoreSnapshot(snapshotId: string): boolean {
    const targetSnapshot = this._snapshots.find((s) => s.snapshotId === snapshotId);
    if (!targetSnapshot) return false;

    // Reconstruct WorldModel from snapshot data
    const reconstructedEntities: Entity[] = [];
    for (const [id, props] of Object.entries(targetSnapshot.entityStates)) {
      const existing = this._currentModel.getEntity(id);
      const entityType = existing?.type ?? 'RestoredEntity';
      const entityName = existing?.name ?? id;

      reconstructedEntities.push(
        new Entity({
          id,
          type: entityType,
          name: entityName,
          state: props,
          metadata: {
            sourceSystem: `TimeMachine:${snapshotId}`,
            updatedAt: targetSnapshot.timestamp,
          },
        })
      );
    }

    const reconstructedRels: Relationship[] = targetSnapshot.relationships.map(
      (r) =>
        new Relationship({
          id: r.id,
          sourceId: r.sourceId,
          targetId: r.targetId,
          relationType: r.relationType,
          weight: r.weight,
          attributes: r.attributes,
        })
    );

    this._currentModel = new WorldModel(
      {
        id: this._currentModel.id,
        name: this._currentModel.name,
        tenantId: this.tenantId,
        version: this._version + 1,
      },
      {
        entities: reconstructedEntities,
        relationships: reconstructedRels,
        constraints: this._currentModel.getConstraints(),
        behaviors: this._currentModel.getBehaviors(),
      }
    );

    this._version++;
    return true;
  }

  public addAssumption(assumption: ModelAssumption): void {
    this._assumptions.push(assumption);
  }

  public removeAssumption(assumptionId: string): void {
    this._assumptions = this._assumptions.filter((a) => a.id !== assumptionId);
  }

  /**
   * Clones this Digital Twin into an isolated fork for simulations or sandboxes.
   */
  public fork(forkId: string, forkName?: string): DigitalTwin {
    return new DigitalTwin({
      id: forkId,
      name: forkName ?? `${this.name} (Fork)`,
      targetSystemId: this.targetSystemId,
      primarySourceSystem: `ForkOf:${this.id}`,
      tenantId: this.tenantId,
      description: `Cloned from ${this.id} at version ${this._version}`,
      baselineModel: this._currentModel.clone({ id: `model_${forkId}` }),
      assumptions: this._assumptions,
    });
  }
}
