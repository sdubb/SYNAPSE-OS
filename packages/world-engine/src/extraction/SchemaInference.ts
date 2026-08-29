/**
 * @file SchemaInference.ts
 * @description Infers property types, shapes, constraints, format hints, and enum candidates from raw data samples.
 */

export type InferredType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'uuid'
  | 'email'
  | 'url'
  | 'json'
  | 'array'
  | 'object'
  | 'null'
  | 'union';

export interface FieldSchema {
  readonly name: string;
  readonly type: InferredType;
  readonly unionTypes?: InferredType[];
  readonly nullable: boolean;
  readonly optional: boolean;
  readonly sampleValues: readonly unknown[];
  readonly enumCandidates?: readonly string[];
  readonly nestedSchema?: Record<string, FieldSchema>;
  readonly itemSchema?: FieldSchema;
  readonly format?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
}

export interface InferredModelSchema {
  readonly name: string;
  readonly totalSamples: number;
  readonly fields: Record<string, FieldSchema>;
  readonly inferredPrimaryKey?: string;
  readonly inferredForeignKeys: Array<{ field: string; candidateTargetType: string }>;
}

export class SchemaInference {
  private static readonly ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

  /**
   * Infers schema from an array of sample records.
   */
  public static inferFromRecords(
    samples: Array<Record<string, unknown>>,
    schemaName = 'InferredEntity'
  ): InferredModelSchema {
    const totalSamples = samples.length;
    if (totalSamples === 0) {
      return {
        name: schemaName,
        totalSamples: 0,
        fields: {},
        inferredForeignKeys: [],
      };
    }

    const fieldOccurrences: Record<string, number> = {};
    const fieldValues: Record<string, unknown[]> = {};

    for (const record of samples) {
      if (!record || typeof record !== 'object') continue;
      for (const [key, value] of Object.entries(record)) {
        fieldOccurrences[key] = (fieldOccurrences[key] ?? 0) + 1;
        if (!fieldValues[key]) {
          fieldValues[key] = [];
        }
        if (fieldValues[key]!.length < 100) {
          fieldValues[key]!.push(value);
        }
      }
    }

    const fields: Record<string, FieldSchema> = {};
    let inferredPrimaryKey: string | undefined;
    const inferredForeignKeys: Array<{ field: string; candidateTargetType: string }> = [];

    for (const [key, values] of Object.entries(fieldValues)) {
      const occurrences = fieldOccurrences[key] ?? 0;
      const isOptional = occurrences < totalSamples;
      const fieldSchema = this.inferField(key, values, isOptional);
      fields[key] = fieldSchema;

      // Primary Key Heuristics: key is "id" or ends with "_id", has 100% presence, and all non-null values are unique
      const nonNullValues = values.filter((v) => v !== null && v !== undefined);
      const uniqueCount = new Set(nonNullValues.map(String)).size;
      const isUnique = uniqueCount === nonNullValues.length && nonNullValues.length === totalSamples;

      if ((key === 'id' || key === `${schemaName.toLowerCase()}_id` || key === '_id') && isUnique) {
        inferredPrimaryKey = key;
      }

      // Foreign Key Heuristics: ends in _id, Id, or Ref
      if (key !== 'id' && (key.endsWith('_id') || key.endsWith('Id') || key.endsWith('Ref'))) {
        let target = key.replace(/(_id|Id|Ref)$/, '');
        target = target.charAt(0).toUpperCase() + target.slice(1);
        inferredForeignKeys.push({ field: key, candidateTargetType: target });
      }
    }

    // Fallback for primary key if no standard id found
    if (!inferredPrimaryKey) {
      for (const [key, field] of Object.entries(fields)) {
        if (!field.optional && !field.nullable && (field.type === 'string' || field.type === 'uuid' || field.type === 'integer')) {
          const vals = fieldValues[key]?.filter((v) => v !== null && v !== undefined) ?? [];
          if (new Set(vals.map(String)).size === totalSamples) {
            inferredPrimaryKey = key;
            break;
          }
        }
      }
    }

    return {
      name: schemaName,
      totalSamples,
      fields,
      inferredPrimaryKey,
      inferredForeignKeys,
    };
  }

  /**
   * Infers the schema of a single field from sample values.
   */
  public static inferField(fieldName: string, values: unknown[], isOptional = false): FieldSchema {
    let nullable = false;
    const typeSet = new Set<InferredType>();
    const nonNullValues: unknown[] = [];

    let minLength = Infinity;
    let maxLength = -Infinity;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (const val of values) {
      if (val === null || val === undefined) {
        nullable = true;
        continue;
      }

      nonNullValues.push(val);
      const detected = this.detectType(val);
      typeSet.add(detected);

      if (typeof val === 'string') {
        minLength = Math.min(minLength, val.length);
        maxLength = Math.max(maxLength, val.length);
      } else if (typeof val === 'number') {
        minValue = Math.min(minValue, val);
        maxValue = Math.max(maxValue, val);
      }
    }

    let finalType: InferredType = 'string';
    let unionTypes: InferredType[] | undefined;

    if (typeSet.size === 0) {
      finalType = 'null';
      nullable = true;
    } else if (typeSet.size === 1) {
      finalType = typeSet.values().next().value!;
    } else {
      // Check if mix of integer and number -> number
      if (typeSet.has('integer') && typeSet.has('number') && typeSet.size === 2) {
        finalType = 'number';
      } else {
        finalType = 'union';
        unionTypes = Array.from(typeSet);
      }
    }

    // Enum candidate check: string type, at least 5 samples, unique values <= 10, distinct ratio < 0.2
    let enumCandidates: string[] | undefined;
    if ((finalType === 'string' || finalType === 'integer') && nonNullValues.length >= 5) {
      const distinctVals = Array.from(new Set(nonNullValues.map(String)));
      if (distinctVals.length <= 10 && distinctVals.length / nonNullValues.length < 0.5) {
        enumCandidates = distinctVals;
      }
    }

    // Nested object schema inference
    let nestedSchema: Record<string, FieldSchema> | undefined;
    if (finalType === 'object') {
      const objRecords = nonNullValues.filter(
        (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
      );
      if (objRecords.length > 0) {
        nestedSchema = this.inferFromRecords(objRecords, fieldName).fields;
      }
    }

    // Array item schema inference
    let itemSchema: FieldSchema | undefined;
    if (finalType === 'array') {
      const arrayItems: unknown[] = [];
      for (const arr of nonNullValues) {
        if (Array.isArray(arr)) {
          arrayItems.push(...arr.slice(0, 20));
        }
      }
      if (arrayItems.length > 0) {
        itemSchema = this.inferField(`${fieldName}_item`, arrayItems);
      }
    }

    return {
      name: fieldName,
      type: finalType,
      unionTypes,
      nullable,
      optional: isOptional,
      sampleValues: nonNullValues.slice(0, 5),
      enumCandidates,
      nestedSchema,
      itemSchema,
      minLength: minLength !== Infinity ? minLength : undefined,
      maxLength: maxLength !== -Infinity ? maxLength : undefined,
      minValue: minValue !== Infinity ? minValue : undefined,
      maxValue: maxValue !== -Infinity ? maxValue : undefined,
    };
  }

  private static detectType(value: unknown): InferredType {
    if (value === null || value === undefined) return 'null';

    if (typeof value === 'boolean') return 'boolean';

    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }

    if (typeof value === 'string') {
      if (this.UUID_REGEX.test(value)) return 'uuid';
      if (this.ISO_DATE_REGEX.test(value)) return 'date';
      if (this.EMAIL_REGEX.test(value)) return 'email';
      if (this.URL_REGEX.test(value)) return 'url';
      return 'string';
    }

    if (Array.isArray(value)) return 'array';

    if (typeof value === 'object') return 'object';

    return 'string';
  }
}
