/**
 * @file TwinBuilder.ts
 * @description Fluent builder for constructing Digital Twins from World Models, telemetry streams, and schema definitions.
 */

import { WorldModel, Entity, Relationship, type PropertyValue } from '@synapse/world-engine';
import { DigitalTwin } from './DigitalTwin.js';
import type { ModelAssumption } from './TwinConfidence.js';

export class TwinBuilder {
  private _twinId?: string;
  private _name?: string;
  private _targetSystemId?: string;
  private _primarySourceSystem = 'direct_telemetry';
  private _tenantId = 'default-tenant';
  private _description?: string;
  private _entities: Map<string, Entity> = new Map();
  private _relationships: Map<string, Relationship> = new Map();
  private _assumptions: ModelAssumption[] = [];
  private _maxSnapshotHistory = 50;

  public withId(id: string): this {
    this._twinId = id;
    return this;
  }

  public withName(name: string): this {
    this._name = name;
    return this;
  }

  public withTargetSystem(targetSystemId: string): this {
    this._targetSystemId = targetSystemId;
    return this;
  }

  public withSourceSystem(sourceSystem: string): this {
    this._primarySourceSystem = sourceSystem;
    return this;
  }

  public withTenant(tenantId: string): this {
    this._tenantId = tenantId;
    return this;
  }

  public withDescription(description: string): this {
    this._description = description;
    return this;
  }

  public addEntity(entity: Entity): this {
    this._entities.set(entity.id, entity);
    return this;
  }

  public addEntities(entities: Iterable<Entity>): this {
    for (const e of entities) {
      this.addEntity(e);
    }
    return this;
  }

  public addRelationship(relationship: Relationship): this {
    this._relationships.set(relationship.id, relationship);
    return this;
  }

  public addRelationships(relationships: Iterable<Relationship>): this {
    for (const r of relationships) {
      this.addRelationship(r);
    }
    return this;
  }

  public addAssumption(assumption: ModelAssumption): this {
    this._assumptions.push(assumption);
    return this;
  }

  public fromWorldModel(model: WorldModel): this {
    this._tenantId = model.tenantId;
    for (const entity of model.getAllEntities()) {
      this.addEntity(entity);
    }
    for (const rel of model.getAllRelationships()) {
      this.addRelationship(rel);
    }
    return this;
  }

  public fromTelemetrySample(
    systemId: string,
    telemetryData: Record<string, PropertyValue>,
    entityType = 'SystemComponent'
  ): this {
    this._targetSystemId = systemId;
    this._primarySourceSystem = 'direct_telemetry';

    const entity = new Entity({
      id: systemId,
      type: entityType,
      name: systemId,
      state: telemetryData,
      metadata: {
        sourceSystem: 'telemetry_sample',
        confidenceScore: 1.0,
      },
    });

    this.addEntity(entity);
    return this;
  }

  public build(): DigitalTwin {
    const id = this._twinId ?? `twin_${this._targetSystemId ?? 'system'}_${Date.now()}`;
    const name = this._name ?? `Digital Twin - ${this._targetSystemId ?? id}`;
    const targetSystemId = this._targetSystemId ?? id;

    const baselineModel = new WorldModel(
      {
        id: `model_${id}`,
        name: `${name} Model`,
        tenantId: this._tenantId,
        description: this._description,
      },
      {
        entities: this._entities.values(),
        relationships: this._relationships.values(),
      }
    );

    return new DigitalTwin({
      id,
      name,
      targetSystemId,
      primarySourceSystem: this._primarySourceSystem,
      tenantId: this._tenantId,
      description: this._description,
      baselineModel,
      assumptions: this._assumptions,
      maxSnapshotHistory: this._maxSnapshotHistory,
    });
  }
}
