/**
 * @file TwinSynchronizer.ts
 * @description Real-time telemetry synchronizer for Digital Twins with automatic state drift detection, threshold alerts, and sync health monitoring.
 */

import type { PropertyValue } from '@synapse/world-engine';
import { DigitalTwin } from './DigitalTwin.js';

export interface TelemetryPacket {
  readonly systemId: string;
  readonly entityId?: string;
  readonly timestamp: number;
  readonly payload: Record<string, PropertyValue>;
  readonly source: string;
}

export type DriftSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface StateDriftRecord {
  readonly entityId: string;
  readonly propertyKey: string;
  readonly expectedValue: PropertyValue;
  readonly observedValue: PropertyValue;
  readonly deltaPercent?: number;
  readonly severity: DriftSeverity;
  readonly detectedAt: number;
  readonly message: string;
}

export interface SyncReport {
  readonly syncId: string;
  readonly twinId: string;
  readonly timestamp: number;
  readonly packetsProcessed: number;
  readonly stateUpdatesCount: number;
  readonly driftsDetected: readonly StateDriftRecord[];
  readonly maxDriftSeverity: DriftSeverity;
  readonly durationMs: number;
}

export interface DriftRule {
  readonly entityType?: string;
  readonly propertyKey: string;
  readonly tolerancePercent?: number; // E.g., 10 means +/- 10% numeric change
  readonly allowedValues?: readonly PropertyValue[];
  readonly criticalThreshold?: number;
}

export class TwinSynchronizer {
  private readonly _driftRules: DriftRule[] = [];
  private readonly _driftListeners: Array<(drift: StateDriftRecord, twin: DigitalTwin) => void> = [];
  private _totalSyncs = 0;
  private _totalDrifts = 0;

  public registerDriftRule(rule: DriftRule): this {
    this._driftRules.push(rule);
    return this;
  }

  public onDriftDetected(listener: (drift: StateDriftRecord, twin: DigitalTwin) => void): this {
    this._driftListeners.push(listener);
    return this;
  }

  /**
   * Synchronizes incoming telemetry packets into the twin and detects state drift.
   */
  public sync(twin: DigitalTwin, packets: readonly TelemetryPacket[]): SyncReport {
    const startTime = Date.now();
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const updates: Array<{ entityId: string; stateDelta: Record<string, PropertyValue> }> = [];
    const drifts: StateDriftRecord[] = [];

    for (const packet of packets) {
      const targetEntityId = packet.entityId ?? twin.targetSystemId;
      const existingEntity = twin.model.getEntity(targetEntityId);

      if (existingEntity) {
        // Check drift against existing state
        for (const [propKey, observedVal] of Object.entries(packet.payload)) {
          const expectedVal = existingEntity.state.get(propKey);

          if (expectedVal !== undefined && expectedVal !== null && observedVal !== expectedVal) {
            const drift = this.evaluateDrift(existingEntity.type, propKey, expectedVal, observedVal, targetEntityId);
            if (drift) {
              drifts.push(drift);
              this._totalDrifts++;
              this.notifyDrift(drift, twin);
            }
          }
        }
      }

      updates.push({
        entityId: targetEntityId,
        stateDelta: packet.payload,
      });
    }

    if (updates.length > 0) {
      twin.applyTelemetry(updates, Date.now());
    }

    this._totalSyncs++;

    const maxDriftSeverity = this.calculateMaxSeverity(drifts);

    return {
      syncId,
      twinId: twin.id,
      timestamp: Date.now(),
      packetsProcessed: packets.length,
      stateUpdatesCount: updates.length,
      driftsDetected: Object.freeze(drifts),
      maxDriftSeverity,
      durationMs: Date.now() - startTime,
    };
  }

  private evaluateDrift(
    entityType: string,
    propertyKey: string,
    expectedVal: PropertyValue,
    observedVal: PropertyValue,
    entityId: string
  ): StateDriftRecord | null {
    // Find matching rule
    const rule = this._driftRules.find(
      (r) => r.propertyKey === propertyKey && (!r.entityType || r.entityType === entityType)
    );

    let severity: DriftSeverity = 'low';
    let deltaPercent: number | undefined;

    if (typeof expectedVal === 'number' && typeof observedVal === 'number') {
      const diff = Math.abs(observedVal - expectedVal);
      deltaPercent = expectedVal !== 0 ? Number(((diff / Math.abs(expectedVal)) * 100).toFixed(2)) : 100;

      if (rule?.tolerancePercent !== undefined) {
        if (deltaPercent <= rule.tolerancePercent) {
          return null; // Within tolerance
        }
      }

      if (rule?.criticalThreshold !== undefined && observedVal >= rule.criticalThreshold) {
        severity = 'critical';
      } else if (deltaPercent > 50) {
        severity = 'high';
      } else if (deltaPercent > 20) {
        severity = 'medium';
      } else {
        severity = 'low';
      }
    } else {
      if (rule?.allowedValues && !rule.allowedValues.includes(observedVal)) {
        severity = 'high';
      }
    }

    return {
      entityId,
      propertyKey,
      expectedValue: expectedVal,
      observedValue: observedVal,
      deltaPercent,
      severity,
      detectedAt: Date.now(),
      message: `State drift on '${propertyKey}': expected '${String(expectedVal)}', observed '${String(observedVal)}'`,
    };
  }

  private calculateMaxSeverity(drifts: readonly StateDriftRecord[]): DriftSeverity {
    if (drifts.length === 0) return 'none';
    if (drifts.some((d) => d.severity === 'critical')) return 'critical';
    if (drifts.some((d) => d.severity === 'high')) return 'high';
    if (drifts.some((d) => d.severity === 'medium')) return 'medium';
    return 'low';
  }

  private notifyDrift(drift: StateDriftRecord, twin: DigitalTwin): void {
    for (const listener of this._driftListeners) {
      try {
        listener(drift, twin);
      } catch (err) {
        console.error('Error in drift listener:', err);
      }
    }
  }
}
