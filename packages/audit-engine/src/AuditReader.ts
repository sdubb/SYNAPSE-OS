import { AuditRecord, AuditCategory, AuditSeverity, AuditStorageAdapter, InMemoryAuditStorageAdapter } from './AuditWriter.js';
import { AuditHasher } from './AuditHasher.js';

export interface AuditQueryFilter {
  tenantId?: string;
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  categories?: AuditCategory[];
  eventTypes?: string[];
  severities?: AuditSeverity[];
  actorId?: string;
  actorType?: 'USER' | 'AGENT' | 'SYSTEM' | 'CONNECTOR' | 'ANONYMOUS';
  targetId?: string;
  correlationId?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
  fromSequence?: number;
  toSequence?: number;
}

export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
  order?: 'ASC' | 'DESC';
  verifyIntegrity?: boolean;
}

export interface AuditQueryResult {
  records: AuditRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  integrityVerified?: boolean;
  integrityReason?: string;
}

export class AuditReader {
  private readonly storage: AuditStorageAdapter;

  constructor(storageAdapter?: AuditStorageAdapter) {
    this.storage = storageAdapter ?? new InMemoryAuditStorageAdapter();
  }

  /**
   * Queries audit records using flexible multi-field filtering and pagination.
   */
  public async query(
    filter: AuditQueryFilter,
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    const rawRecords = await this.storage.queryRecords(filter);

    let filtered = rawRecords.filter((rec) => {
      const p = rec.payload;

      if (filter.tenantId && p.tenantId !== filter.tenantId) return false;
      if (filter.agentId && p.agentId !== filter.agentId) return false;
      if (filter.taskId && p.taskId !== filter.taskId) return false;
      if (filter.sessionId && p.sessionId !== filter.sessionId) return false;
      if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(p.category)) return false;
      if (filter.eventTypes && filter.eventTypes.length > 0 && !filter.eventTypes.includes(p.eventType)) return false;
      if (filter.severities && filter.severities.length > 0 && !filter.severities.includes(p.severity)) return false;
      if (filter.actorId && p.actor.id !== filter.actorId) return false;
      if (filter.actorType && p.actor.type !== filter.actorType) return false;
      if (filter.targetId && p.targetId !== filter.targetId) return false;
      if (filter.correlationId && p.correlationId !== filter.correlationId) return false;

      if (filter.fromSequence !== undefined && rec.sequence < filter.fromSequence) return false;
      if (filter.toSequence !== undefined && rec.sequence > filter.toSequence) return false;

      if (filter.fromTimestamp) {
        const fromDate = new Date(filter.fromTimestamp).getTime();
        const recDate = new Date(p.timestamp || rec.createdAt).getTime();
        if (recDate < fromDate) return false;
      }

      if (filter.toTimestamp) {
        const toDate = new Date(filter.toTimestamp).getTime();
        const recDate = new Date(p.timestamp || rec.createdAt).getTime();
        if (recDate > toDate) return false;
      }

      return true;
    });

    const order = options.order ?? 'DESC';
    filtered.sort((a, b) => {
      return order === 'ASC' ? a.sequence - b.sequence : b.sequence - a.sequence;
    });

    const total = filtered.length;
    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const offset = options.offset && options.offset >= 0 ? options.offset : 0;
    const paginated = filtered.slice(offset, offset + limit);

    let integrityVerified: boolean | undefined;
    let integrityReason: string | undefined;

    if (options.verifyIntegrity && paginated.length > 0) {
      const verification = AuditHasher.verifyChainIntegrity(paginated);
      integrityVerified = verification.valid;
      integrityReason = verification.reason;
    }

    return {
      records: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      integrityVerified,
      integrityReason,
    };
  }

  /**
   * Retrieves a single record by its unique ID.
   */
  public async getById(id: string): Promise<AuditRecord | null> {
    const rawRecords = await this.storage.queryRecords({});
    return rawRecords.find((r) => r.id === id) ?? null;
  }

  /**
   * Retrieves an unbroken continuous sequence of audit records for integrity verification.
   */
  public async getSequenceRange(startSeq: number, endSeq: number): Promise<AuditRecord[]> {
    const rawRecords = await this.storage.queryRecords({});
    return rawRecords
      .filter((r) => r.sequence >= startSeq && r.sequence <= endSeq)
      .sort((a, b) => a.sequence - b.sequence);
  }
}
