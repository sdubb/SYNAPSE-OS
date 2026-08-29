/**
 * @file Relationship.ts
 * @description Directed edge representation in the World Engine state graph connecting entities with types, weights, and constraints.
 */

import type { PropertyValue } from './State.js';

export type RelationshipDirection = 'outbound' | 'inbound' | 'bidirectional';

export interface RelationshipMetadata {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly confidenceScore: number;
  readonly sourceSystem?: string;
  readonly tenantId?: string;
  readonly tags: readonly string[];
}

export interface RelationshipConfig {
  readonly id?: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly weight?: number;
  readonly bidirectional?: boolean;
  readonly attributes?: Record<string, PropertyValue>;
  readonly metadata?: Partial<RelationshipMetadata>;
}

export class Relationship {
  public readonly id: string;
  public readonly sourceId: string;
  public readonly targetId: string;
  public readonly relationType: string;
  public readonly weight: number;
  public readonly bidirectional: boolean;
  public readonly attributes: Readonly<Record<string, PropertyValue>>;
  public readonly metadata: RelationshipMetadata;

  constructor(config: RelationshipConfig) {
    if (!config.sourceId || typeof config.sourceId !== 'string') {
      throw new Error('Relationship must specify a sourceId');
    }
    if (!config.targetId || typeof config.targetId !== 'string') {
      throw new Error('Relationship must specify a targetId');
    }
    if (!config.relationType || typeof config.relationType !== 'string') {
      throw new Error('Relationship must specify a relationType');
    }

    this.sourceId = config.sourceId;
    this.targetId = config.targetId;
    this.relationType = config.relationType;
    this.weight = config.weight ?? 1.0;
    this.bidirectional = config.bidirectional ?? false;
    this.attributes = Object.freeze(config.attributes ? { ...config.attributes } : {});

    const now = Date.now();
    this.metadata = Object.freeze({
      createdAt: config.metadata?.createdAt ?? now,
      updatedAt: config.metadata?.updatedAt ?? now,
      confidenceScore: config.metadata?.confidenceScore ?? 1.0,
      sourceSystem: config.metadata?.sourceSystem,
      tenantId: config.metadata?.tenantId,
      tags: Object.freeze(config.metadata?.tags ? [...config.metadata.tags] : []),
    });

    this.id = config.id ?? `${this.sourceId}-[${this.relationType}]->${this.targetId}`;
  }

  public getAttribute<T extends PropertyValue = PropertyValue>(key: string, defaultValue?: T): T | undefined {
    const value = this.attributes[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  public clone(overrides?: Partial<RelationshipConfig>): Relationship {
    return new Relationship({
      id: overrides?.id ?? this.id,
      sourceId: overrides?.sourceId ?? this.sourceId,
      targetId: overrides?.targetId ?? this.targetId,
      relationType: overrides?.relationType ?? this.relationType,
      weight: overrides?.weight ?? this.weight,
      bidirectional: overrides?.bidirectional ?? this.bidirectional,
      attributes: overrides?.attributes ?? { ...this.attributes },
      metadata: {
        ...this.metadata,
        ...overrides?.metadata,
        updatedAt: Date.now(),
      },
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      relationType: this.relationType,
      weight: this.weight,
      bidirectional: this.bidirectional,
      attributes: this.attributes,
      metadata: this.metadata,
    };
  }

  public static fromJSON(json: {
    id?: string;
    sourceId: string;
    targetId: string;
    relationType: string;
    weight?: number;
    bidirectional?: boolean;
    attributes?: Record<string, PropertyValue>;
    metadata?: Partial<RelationshipMetadata>;
  }): Relationship {
    return new Relationship(json);
  }
}
