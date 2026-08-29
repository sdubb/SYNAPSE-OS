import { createHash } from 'node:crypto';
import type { PropertyValue } from '@synapse/world-engine';
import type { ConfidenceScoreBreakdown } from './TwinConfidence.js';

export interface TwinSnapshotData {
  readonly snapshotId: string;
  readonly twinId: string;
  readonly version: number;
  readonly timestamp: number;
  readonly label?: string;
  readonly reason?: string;
  readonly entityStates: Readonly<Record<string, Record<string, PropertyValue>>>;
  readonly relationships: ReadonlyArray<{
    readonly id: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly relationType: string;
    readonly weight: number;
    readonly attributes?: Record<string, PropertyValue>;
  }>;
  readonly confidence: ConfidenceScoreBreakdown;
  readonly checksum: string;
}

export class TwinSnapshot {
  public readonly data: TwinSnapshotData;

  constructor(data: Omit<TwinSnapshotData, 'checksum'> & { checksum?: string }) {
    const computedChecksum = data.checksum ?? TwinSnapshot.computeChecksum(data.entityStates, data.relationships);
    this.data = Object.freeze({
      ...data,
      checksum: computedChecksum,
      entityStates: Object.freeze(JSON.parse(JSON.stringify(data.entityStates))),
      relationships: Object.freeze(JSON.parse(JSON.stringify(data.relationships))),
    });
  }

  public get snapshotId(): string {
    return this.data.snapshotId;
  }

  public get twinId(): string {
    return this.data.twinId;
  }

  public get version(): number {
    return this.data.version;
  }

  public get timestamp(): number {
    return this.data.timestamp;
  }

  public get entityStates(): Readonly<Record<string, Record<string, PropertyValue>>> {
    return this.data.entityStates;
  }

  public get relationships(): ReadonlyArray<{
    readonly id: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly relationType: string;
    readonly weight: number;
    readonly attributes?: Record<string, PropertyValue>;
  }> {
    return this.data.relationships;
  }

  public get confidence(): ConfidenceScoreBreakdown {
    return this.data.confidence;
  }

  public get checksum(): string {
    return this.data.checksum;
  }

  public verifyIntegrity(): boolean {
    const expected = TwinSnapshot.computeChecksum(this.data.entityStates, this.data.relationships);
    return expected === this.data.checksum;
  }

  public toJSON(): Record<string, unknown> {
    return { ...this.data };
  }

  public static fromJSON(json: Record<string, unknown>): TwinSnapshot {
    return new TwinSnapshot(json as unknown as TwinSnapshotData);
  }

  private static canonicalStringify(obj: unknown): string {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'number') return Number.isFinite(obj) ? String(obj) : 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'string') return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map((x) => this.canonicalStringify(x)).join(',')}]`;
    if (typeof obj === 'object') {
      const rec = obj as Record<string, unknown>;
      const keys = Object.keys(rec).filter((k) => rec[k] !== undefined).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${this.canonicalStringify(rec[k])}`).join(',')}}`;
    }
    return JSON.stringify(obj);
  }

  public static computeChecksum(
    entityStates: Record<string, Record<string, PropertyValue>>,
    relationships: readonly unknown[]
  ): string {
    const serialized = this.canonicalStringify({ entityStates, relationships });
    const sha = createHash('sha256').update(serialized, 'utf8').digest('hex');
    return `snp_${sha.slice(0, 32)}`;
  }
}
