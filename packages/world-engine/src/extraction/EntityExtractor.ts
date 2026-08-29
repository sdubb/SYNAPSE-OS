/**
 * @file EntityExtractor.ts
 * @description Automatically extracts domain entities from telemetry, JSON payloads, configurations, and source code.
 */

import { Entity, type EntityLifecycleStatus } from '../model/Entity.js';
import { SchemaInference } from './SchemaInference.js';
import type { PropertyValue } from '../model/State.js';

export interface ExtractionRule {
  readonly entityType: string;
  readonly idPattern: string | ((data: Record<string, unknown>) => string);
  readonly namePattern?: string | ((data: Record<string, unknown>) => string);
  readonly statusPattern?: (data: Record<string, unknown>) => EntityLifecycleStatus;
  readonly attributeMapping?: Record<string, string>; // targetKey -> sourceKey
  readonly defaultTags?: readonly string[];
  readonly condition?: (data: Record<string, unknown>) => boolean;
}

export interface ExtractionResult {
  readonly entities: Entity[];
  readonly extractedCount: number;
  readonly unmappedCount: number;
  readonly errors: Array<{ record: unknown; error: string }>;
}

export class EntityExtractor {
  private readonly _rules: Map<string, ExtractionRule[]> = new Map();

  /**
   * Registers an extraction rule for a specific source category or general ingestion.
   */
  public registerRule(category: string, rule: ExtractionRule): this {
    let list = this._rules.get(category);
    if (!list) {
      list = [];
      this._rules.set(category, list);
    }
    list.push(rule);
    return this;
  }

  /**
   * Automatically extracts entities from an array of raw structured records.
   */
  public extractFromRecords(
    records: Array<Record<string, unknown>>,
    category = 'default',
    fallbackType = 'UnknownEntity'
  ): ExtractionResult {
    const rules = this._rules.get(category) ?? [];
    const entities: Entity[] = [];
    const errors: Array<{ record: unknown; error: string }> = [];
    let unmappedCount = 0;

    // If no rules exist, infer schema and create generic entities
    if (rules.length === 0) {
      const inferred = SchemaInference.inferFromRecords(records, fallbackType);
      const pkField = inferred.inferredPrimaryKey ?? 'id';

      for (let i = 0; i < records.length; i++) {
        const record = records[i]!;
        try {
          const rawId = record[pkField] ?? `entity_${fallbackType.toLowerCase()}_${i + 1}`;
          const id = String(rawId);
          const name = String(record['name'] ?? record['title'] ?? record['label'] ?? id);

          const entity = new Entity({
            id,
            type: fallbackType,
            name,
            state: record as Record<string, PropertyValue>,
            metadata: {
              sourceSystem: 'EntityExtractor.inferred',
              confidenceScore: 0.85,
              tags: [fallbackType.toLowerCase(), 'auto-extracted'],
            },
          });
          entities.push(entity);
        } catch (err) {
          errors.push({ record, error: err instanceof Error ? err.message : String(err) });
        }
      }

      return {
        entities,
        extractedCount: entities.length,
        unmappedCount: 0,
        errors,
      };
    }

    for (const record of records) {
      let matched = false;

      for (const rule of rules) {
        if (rule.condition && !rule.condition(record)) {
          continue;
        }

        try {
          let id: string;
          if (typeof rule.idPattern === 'function') {
            id = rule.idPattern(record);
          } else {
            id = String(record[rule.idPattern] ?? `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
          }

          let name = id;
          if (typeof rule.namePattern === 'function') {
            name = rule.namePattern(record);
          } else if (typeof rule.namePattern === 'string') {
            name = String(record[rule.namePattern] ?? id);
          }

          const status = rule.statusPattern ? rule.statusPattern(record) : 'active';

          const properties: Record<string, PropertyValue> = {};
          if (rule.attributeMapping) {
            for (const [targetKey, sourceKey] of Object.entries(rule.attributeMapping)) {
              properties[targetKey] = record[sourceKey] as PropertyValue;
            }
          } else {
            Object.assign(properties, record);
          }

          const entity = new Entity({
            id,
            type: rule.entityType,
            name,
            status,
            state: properties,
            metadata: {
              sourceSystem: `EntityExtractor.${category}`,
              confidenceScore: 0.95,
              tags: rule.defaultTags ? [...rule.defaultTags] : [rule.entityType.toLowerCase()],
            },
          });

          entities.push(entity);
          matched = true;
          break; // Matched first applicable rule
        } catch (err) {
          errors.push({ record, error: err instanceof Error ? err.message : String(err) });
        }
      }

      if (!matched) {
        unmappedCount++;
      }
    }

    return {
      entities,
      extractedCount: entities.length,
      unmappedCount,
      errors,
    };
  }

  /**
   * Extracts entities from code artifacts, AST components, or microservice manifests.
   */
  public extractFromServiceManifest(manifest: {
    name: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    env?: Record<string, string>;
    routes?: Array<{ path: string; method: string }>;
  }): Entity[] {
    const entities: Entity[] = [];

    // Service Entity
    const serviceEntity = new Entity({
      id: `service:${manifest.name}`,
      type: 'Service',
      name: manifest.name,
      state: {
        version: manifest.version ?? '0.0.0',
        dependencyCount: Object.keys(manifest.dependencies ?? {}).length,
        devDependencyCount: Object.keys(manifest.devDependencies ?? {}).length,
      },
      metadata: {
        sourceSystem: 'ServiceManifest',
        tags: ['microservice', 'code-component'],
        confidenceScore: 1.0,
      },
    });
    entities.push(serviceEntity);

    // Endpoint Entities
    if (manifest.routes) {
      for (const route of manifest.routes) {
        const endpointEntity = new Entity({
          id: `endpoint:${manifest.name}:${route.method}:${route.path}`,
          type: 'APIEndpoint',
          name: `${route.method.toUpperCase()} ${route.path}`,
          state: {
            path: route.path,
            method: route.method.toUpperCase(),
            service: manifest.name,
          },
          metadata: {
            sourceSystem: 'ServiceManifest',
            tags: ['api-endpoint', route.method.toLowerCase()],
            confidenceScore: 1.0,
          },
        });
        entities.push(endpointEntity);
      }
    }

    return entities;
  }
}
