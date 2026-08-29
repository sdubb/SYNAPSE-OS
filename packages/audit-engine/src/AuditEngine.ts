import {
  AuditWriter,
  AuditRecord,
  AuditRecordPayload,
  AuditActor,
  AuditSeverity,
  AuditStorageAdapter,
  InMemoryAuditStorageAdapter,
  AuditWriterOptions,
} from './AuditWriter.js';
import { AuditReader, AuditQueryFilter, AuditQueryOptions, AuditQueryResult } from './AuditReader.js';
import { AuditHasher } from './AuditHasher.js';
import { AuditRetentionManager, RetentionPolicy, RetentionExecutionResult } from './AuditRetention.js';
import { AuditExporter, AuditExportOptions } from './AuditExporter.js';

export interface AuditEngineOptions {
  writerOptions?: AuditWriterOptions;
  storageAdapter?: AuditStorageAdapter;
  retentionPolicies?: RetentionPolicy[];
}

export class AuditEngine {
  private readonly writer: AuditWriter;
  private readonly reader: AuditReader;
  private readonly retention: AuditRetentionManager;
  private readonly storage: AuditStorageAdapter;

  constructor(options: AuditEngineOptions = {}) {
    this.storage = options.storageAdapter ?? new InMemoryAuditStorageAdapter();
    this.writer = new AuditWriter({
      ...options.writerOptions,
      storageAdapter: this.storage,
    });
    this.reader = new AuditReader(this.storage);
    this.retention = new AuditRetentionManager(this.storage);

    if (options.retentionPolicies) {
      for (const policy of options.retentionPolicies) {
        this.retention.setPolicy(policy);
      }
    }
  }

  public async initialize(): Promise<void> {
    await this.writer.initialize();
  }

  public async log(payload: AuditRecordPayload): Promise<AuditRecord> {
    return this.writer.append(payload);
  }

  public async logSecurityEvent(params: {
    tenantId: string;
    actor: AuditActor;
    eventType: string;
    severity?: AuditSeverity;
    targetId?: string;
    targetType?: string;
    correlationId?: string;
    details: Record<string, unknown>;
  }): Promise<AuditRecord> {
    return this.log({
      category: 'SECURITY',
      eventType: params.eventType,
      severity: params.severity ?? 'WARNING',
      tenantId: params.tenantId,
      actor: params.actor,
      targetId: params.targetId,
      targetType: params.targetType,
      correlationId: params.correlationId,
      details: params.details,
      timestamp: new Date().toISOString(),
    });
  }

  public async logAgentEvent(params: {
    tenantId: string;
    actor: AuditActor;
    eventType: string;
    severity?: AuditSeverity;
    agentId: string;
    taskId?: string;
    sessionId?: string;
    correlationId?: string;
    details: Record<string, unknown>;
  }): Promise<AuditRecord> {
    return this.log({
      category: 'AGENT',
      eventType: params.eventType,
      severity: params.severity ?? 'INFO',
      tenantId: params.tenantId,
      actor: params.actor,
      agentId: params.agentId,
      taskId: params.taskId,
      sessionId: params.sessionId,
      correlationId: params.correlationId,
      details: params.details,
      timestamp: new Date().toISOString(),
    });
  }

  public async logPolicyEvent(params: {
    tenantId: string;
    actor: AuditActor;
    eventType: string;
    severity?: AuditSeverity;
    agentId?: string;
    taskId?: string;
    sessionId?: string;
    policyId?: string;
    ruleId?: string;
    outcome: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'MODIFY';
    correlationId?: string;
    details: Record<string, unknown>;
  }): Promise<AuditRecord> {
    return this.log({
      category: 'POLICY',
      eventType: params.eventType,
      severity: params.severity ?? (params.outcome === 'DENY' ? 'WARNING' : 'INFO'),
      tenantId: params.tenantId,
      actor: params.actor,
      agentId: params.agentId,
      taskId: params.taskId,
      sessionId: params.sessionId,
      correlationId: params.correlationId,
      details: {
        policyId: params.policyId,
        ruleId: params.ruleId,
        outcome: params.outcome,
        ...params.details,
      },
      timestamp: new Date().toISOString(),
    });
  }

  public async logApprovalEvent(params: {
    tenantId: string;
    actor: AuditActor;
    eventType: string;
    severity?: AuditSeverity;
    agentId?: string;
    taskId?: string;
    sessionId?: string;
    approvalId: string;
    decision: 'APPROVED' | 'REJECTED' | 'TIMEOUT' | 'PENDING';
    correlationId?: string;
    details: Record<string, unknown>;
  }): Promise<AuditRecord> {
    return this.log({
      category: 'APPROVAL',
      eventType: params.eventType,
      severity: params.severity ?? (params.decision === 'REJECTED' ? 'WARNING' : 'INFO'),
      tenantId: params.tenantId,
      actor: params.actor,
      agentId: params.agentId,
      taskId: params.taskId,
      sessionId: params.sessionId,
      targetId: params.approvalId,
      targetType: 'APPROVAL_REQUEST',
      correlationId: params.correlationId,
      details: {
        approvalId: params.approvalId,
        decision: params.decision,
        ...params.details,
      },
      timestamp: new Date().toISOString(),
    });
  }

  public async logSystemEvent(params: {
    tenantId?: string;
    eventType: string;
    severity?: AuditSeverity;
    details: Record<string, unknown>;
  }): Promise<AuditRecord> {
    return this.log({
      category: 'SYSTEM',
      eventType: params.eventType,
      severity: params.severity ?? 'INFO',
      tenantId: params.tenantId ?? 'system',
      actor: {
        type: 'SYSTEM',
        id: 'system',
        tenantId: params.tenantId ?? 'system',
      },
      details: params.details,
      timestamp: new Date().toISOString(),
    });
  }

  public async query(
    filter: AuditQueryFilter,
    options?: AuditQueryOptions
  ): Promise<AuditQueryResult> {
    return this.reader.query(filter, options);
  }

  public async verifyIntegrity(
    startSequence?: number,
    endSequence?: number
  ): Promise<{ valid: boolean; brokenAtSequence?: number; reason?: string }> {
    let records: AuditRecord[];
    if (startSequence !== undefined && endSequence !== undefined) {
      records = await this.reader.getSequenceRange(startSequence, endSequence);
    } else {
      const all = await this.storage.queryRecords({});
      records = [...all].sort((a, b) => a.sequence - b.sequence);
    }
    return AuditHasher.verifyChainIntegrity(records);
  }

  public export(records: AuditRecord[], options: AuditExportOptions): string {
    return AuditExporter.export(records, options);
  }

  public setRetentionPolicy(policy: RetentionPolicy): void {
    this.retention.setPolicy(policy);
  }

  public async applyRetention(now?: Date): Promise<RetentionExecutionResult[]> {
    return this.retention.evaluateRetention(now);
  }

  public async flush(): Promise<void> {
    await this.writer.flush();
  }

  public async shutdown(): Promise<void> {
    await this.writer.stop();
  }

  public getStorage(): AuditStorageAdapter {
    return this.storage;
  }
}
