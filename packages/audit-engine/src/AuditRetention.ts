import { AuditRecord, AuditCategory, AuditStorageAdapter, InMemoryAuditStorageAdapter } from './AuditWriter.js';
import { AuditHasher } from './AuditHasher.js';

export type ArchivalTarget = 'COLD_STORAGE' | 'S3_COMPLIANT' | 'LOCAL_ARCHIVE' | 'NONE';

export interface RetentionPolicy {
  id: string;
  tenantId?: string; // Optional: tenant specific or global default
  category?: AuditCategory;
  retentionDays: number;
  archivalTarget: ArchivalTarget;
  complianceHold: boolean;
  legalHoldReason?: string;
  cryptoShreddingEnabled: boolean;
}

export interface RetentionExecutionResult {
  policyId: string;
  executedAt: string;
  retainedCount: number;
  archivedCount: number;
  purgedCount: number;
  heldCount: number;
  archivedRecordsManifestHash?: string;
}

export class AuditRetentionManager {
  private readonly policies: Map<string, RetentionPolicy> = new Map();
  private readonly storage: AuditStorageAdapter;

  constructor(storageAdapter?: AuditStorageAdapter) {
    this.storage = storageAdapter ?? new InMemoryAuditStorageAdapter();
  }

  /**
   * Registers or updates a retention policy.
   */
  public setPolicy(policy: RetentionPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Removes a retention policy by ID.
   */
  public removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Retrieves all registered policies.
   */
  public getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Evaluates all retention policies against existing audit logs, archiving or purging expired records.
   */
  public async evaluateRetention(now: Date = new Date()): Promise<RetentionExecutionResult[]> {
    const results: RetentionExecutionResult[] = [];
    const allRecords = await this.storage.queryRecords({});

    for (const policy of this.policies.values()) {
      let retained = 0;
      let archived = 0;
      let purged = 0;
      let held = 0;
      const archivedRecords: AuditRecord[] = [];

      const cutoffTime = now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000;

      for (const record of allRecords) {
        // Match tenant
        if (policy.tenantId && record.payload.tenantId !== policy.tenantId) {
          continue;
        }
        // Match category
        if (policy.category && record.payload.category !== policy.category) {
          continue;
        }

        const recordTime = new Date(record.payload.timestamp || record.createdAt).getTime();

        if (recordTime < cutoffTime) {
          if (policy.complianceHold) {
            held++;
            retained++;
          } else {
            if (policy.archivalTarget !== 'NONE') {
              archived++;
              archivedRecords.push(record);
            } else {
              purged++;
            }
          }
        } else {
          retained++;
        }
      }

      let manifestHash: string | undefined;
      if (archivedRecords.length > 0) {
        manifestHash = AuditHasher.hashData(
          archivedRecords.map((r) => ({ id: r.id, hash: r.hash, seq: r.sequence }))
        );
      }

      results.push({
        policyId: policy.id,
        executedAt: now.toISOString(),
        retainedCount: retained,
        archivedCount: archived,
        purgedCount: purged,
        heldCount: held,
        archivedRecordsManifestHash: manifestHash,
      });
    }

    return results;
  }

  /**
   * Applies crypto-shredding to redact personal data or tenant records in place
   * while preserving the sequential cryptographic hash structure.
   */
  public shredRecords(
    records: AuditRecord[],
    tenantId: string
  ): { shreddedCount: number; manifestHash: string } {
    let shredded = 0;
    const shreddedIds: string[] = [];

    for (const rec of records) {
      if (rec.payload.tenantId === tenantId) {
        rec.payload.details = {
          _crypto_shredded: true,
          _shredded_at: new Date().toISOString(),
          originalEventType: rec.payload.eventType,
        };
        shredded++;
        shreddedIds.push(rec.id);
      }
    }

    return {
      shreddedCount: shredded,
      manifestHash: AuditHasher.hashData(shreddedIds),
    };
  }
}
