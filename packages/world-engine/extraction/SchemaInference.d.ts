/**
 * @file SchemaInference.ts
 * @description Infers property types, shapes, constraints, format hints, and enum candidates from raw data samples.
 */
export type InferredType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'uuid' | 'email' | 'url' | 'json' | 'array' | 'object' | 'null' | 'union';
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
    readonly inferredForeignKeys: Array<{
        field: string;
        candidateTargetType: string;
    }>;
}
export declare class SchemaInference {
    private static readonly ISO_DATE_REGEX;
    private static readonly UUID_REGEX;
    private static readonly EMAIL_REGEX;
    private static readonly URL_REGEX;
    /**
     * Infers schema from an array of sample records.
     */
    static inferFromRecords(samples: Array<Record<string, unknown>>, schemaName?: string): InferredModelSchema;
    /**
     * Infers the schema of a single field from sample values.
     */
    static inferField(fieldName: string, values: unknown[], isOptional?: boolean): FieldSchema;
    private static detectType;
}
//# sourceMappingURL=SchemaInference.d.ts.map