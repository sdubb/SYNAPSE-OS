/**
 * @file TwinDiff.ts
 * @description Computes structural and property state differences between Digital Twin versions and point-in-time snapshots.
 */

import type { PropertyValue } from '@synapse/world-engine';
import { TwinSnapshot } from './TwinSnapshot.js';

export interface EntityDelta {
  readonly entityId: string;
  readonly type: 'added' | 'removed' | 'modified' | 'unchanged';
  readonly propertyChanges: Record<string, { before?: PropertyValue; after?: PropertyValue }>;
}

export interface RelationshipDelta {
  readonly relationshipId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly type: 'added' | 'removed' | 'modified' | 'unchanged';
  readonly attributeChanges?: Record<string, { before?: PropertyValue; after?: PropertyValue }>;
}

export interface TwinDiffResult {
  readonly baseVersion: number;
  readonly targetVersion: number;
  readonly baseTimestamp: number;
  readonly targetTimestamp: number;
  readonly entityDeltas: readonly EntityDelta[];
  readonly relationshipDeltas: readonly RelationshipDelta[];
  readonly summary: {
    readonly entitiesAdded: number;
    readonly entitiesRemoved: number;
    readonly entitiesModified: number;
    readonly relationshipsAdded: number;
    readonly relationshipsRemoved: number;
    readonly relationshipsModified: number;
    readonly totalDifferences: number;
  };
  readonly hasChanges: boolean;
}

export class TwinDiff {
  /**
   * Compares two snapshots and produces a detailed structural & property diff.
   */
  public static compareSnapshots(base: TwinSnapshot, target: TwinSnapshot): TwinDiffResult {
    const entityDeltas: EntityDelta[] = [];
    const relationshipDeltas: RelationshipDelta[] = [];

    const baseEntities = base.entityStates;
    const targetEntities = target.entityStates;

    const baseEntityIds = new Set(Object.keys(baseEntities));
    const targetEntityIds = new Set(Object.keys(targetEntities));

    let entitiesAdded = 0;
    let entitiesRemoved = 0;
    let entitiesModified = 0;

    // Check added and modified entities
    for (const id of targetEntityIds) {
      if (!baseEntityIds.has(id)) {
        entitiesAdded++;
        const targetProps = targetEntities[id]!;
        const changes: Record<string, { before?: PropertyValue; after?: PropertyValue }> = {};
        for (const [k, v] of Object.entries(targetProps)) {
          changes[k] = { after: v };
        }
        entityDeltas.push({ entityId: id, type: 'added', propertyChanges: changes });
      } else {
        const baseProps = baseEntities[id]!;
        const targetProps = targetEntities[id]!;
        const changes = this.diffPropertyBags(baseProps, targetProps);

        if (Object.keys(changes).length > 0) {
          entitiesModified++;
          entityDeltas.push({ entityId: id, type: 'modified', propertyChanges: changes });
        }
      }
    }

    // Check removed entities
    for (const id of baseEntityIds) {
      if (!targetEntityIds.has(id)) {
        entitiesRemoved++;
        const baseProps = baseEntities[id]!;
        const changes: Record<string, { before?: PropertyValue; after?: PropertyValue }> = {};
        for (const [k, v] of Object.entries(baseProps)) {
          changes[k] = { before: v };
        }
        entityDeltas.push({ entityId: id, type: 'removed', propertyChanges: changes });
      }
    }

    // Relationships diff
    const baseRelMap = new Map(base.relationships.map((r) => [r.id, r]));
    const targetRelMap = new Map(target.relationships.map((r) => [r.id, r]));

    let relationshipsAdded = 0;
    let relationshipsRemoved = 0;
    let relationshipsModified = 0;

    for (const [id, targetRel] of targetRelMap) {
      if (!baseRelMap.has(id)) {
        relationshipsAdded++;
        relationshipDeltas.push({
          relationshipId: id,
          sourceId: targetRel.sourceId,
          targetId: targetRel.targetId,
          relationType: targetRel.relationType,
          type: 'added',
        });
      } else {
        const baseRel = baseRelMap.get(id)!;
        const attrChanges = this.diffPropertyBags(baseRel.attributes ?? {}, targetRel.attributes ?? {});
        if (Object.keys(attrChanges).length > 0 || baseRel.weight !== targetRel.weight) {
          relationshipsModified++;
          relationshipDeltas.push({
            relationshipId: id,
            sourceId: targetRel.sourceId,
            targetId: targetRel.targetId,
            relationType: targetRel.relationType,
            type: 'modified',
            attributeChanges: attrChanges,
          });
        }
      }
    }

    for (const [id, baseRel] of baseRelMap) {
      if (!targetRelMap.has(id)) {
        relationshipsRemoved++;
        relationshipDeltas.push({
          relationshipId: id,
          sourceId: baseRel.sourceId,
          targetId: baseRel.targetId,
          relationType: baseRel.relationType,
          type: 'removed',
        });
      }
    }

    const totalDifferences =
      entitiesAdded + entitiesRemoved + entitiesModified + relationshipsAdded + relationshipsRemoved + relationshipsModified;

    return {
      baseVersion: base.version,
      targetVersion: target.version,
      baseTimestamp: base.timestamp,
      targetTimestamp: target.timestamp,
      entityDeltas: Object.freeze(entityDeltas),
      relationshipDeltas: Object.freeze(relationshipDeltas),
      summary: {
        entitiesAdded,
        entitiesRemoved,
        entitiesModified,
        relationshipsAdded,
        relationshipsRemoved,
        relationshipsModified,
        totalDifferences,
      },
      hasChanges: totalDifferences > 0,
    };
  }

  private static diffPropertyBags(
    before: Record<string, PropertyValue>,
    after: Record<string, PropertyValue>
  ): Record<string, { before?: PropertyValue; after?: PropertyValue }> {
    const changes: Record<string, { before?: PropertyValue; after?: PropertyValue }> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const valBefore = before[key];
      const valAfter = after[key];

      if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
        changes[key] = {
          before: valBefore,
          after: valAfter,
        };
      }
    }

    return changes;
  }
}
