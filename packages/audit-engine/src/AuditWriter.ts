import { randomUUID } from 'node:crypto';
import { AuditHasher } from './AuditHasher.js';

export type AuditCategory = 'SECURITY' | 'AGENT' | 'POLICY' | 'APPROVAL' | 'SYSTEM' | 'WORKSPACE' | 'CONNECTOR';
export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditActor {
  type: 'USER' | 'AGENT' | 'SYSTEM' | 'CONNECTOR' | 'ANONYMOUS';
  id: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditRecordPayload {
  category: AuditCategory;
  eventType: string;
  severity: AuditSeverity;
  tenantId: string;
  actor: AuditActor;
  targetId?: string;
  targetType?: string;
  sessionId?: string;
  taskId?: string;
  agentId?: string;
  correlationId?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface AuditRecord {
  id: string;
  sequence: number;
  prevHash: string;
  hash: string;
  merkleRoot?: string;
  blockNumber?: number;
  payload: AuditRecordPayload;
  createdAt: string;
}

export interface AuditBlock {
  blockNumber: number;
  startSequence: number;
  endSequence: number;
  recordCount: number;
  merkleRoot: string;
  prevBlockHash: string;
  blockHash: string;
  createdAt: string;
}

export interface AuditStorageAdapter {
  appendRecords(records: AuditRecord[]): Promise<void>;
  appendBlock(block: AuditBlock): Promise<void>;
  getLatestRecord(tenantId?: string): Promise<AuditRecord | null>;
  getLatestBlock(): Promise<AuditBlock | null>;
  queryRecords(filter: unknown): Promise<AuditRecord[]>;
}

export class InMemoryAuditStorageAdapter implements AuditStorageAdapter {
  private records: AuditRecord[] = [];
  private blocks: AuditBlock[] = [];

  public async appendRecords(records: AuditRecord[]): Promise<void> {
    this.records.push(...records);
  }

  public async appendBlock(block: AuditBlock): Promise<void> {
    this.blocks.push(block);
  }

  public async getLatestRecord(tenantId?: string): Promise<AuditRecord | null> {
    if (this.records.length === 0) return null;
    if (!tenantId) {
      return this.records[this.records.length - 1];
    }
    for (let i = this.records.length - 1; i >= 0; i--) {
      if (this.records[i].payload.tenantId === tenantId) {
        return this.records[i];
      }
    }
    return null;
  }

  public async getLatestBlock(): Promise<AuditBlock | null> {
    if (this.blocks.length === 0) return null;
    return this.blocks[this.blocks.length - 1];
  }

  public async queryRecords(): Promise<AuditRecord[]> {
    return [...this.records];
  }

  public getAllRecords(): AuditRecord[] {
    return [...this.records];
  }

  public getAllBlocks(): AuditBlock[] {
    return [...this.blocks];
  }
}

export interface AuditWriterOptions {
  batchSize?: number;
  flushIntervalMs?: number;
  maxQueueSize?: number;
  storageAdapter?: AuditStorageAdapter;
  autoStart?: boolean;
}

export class AuditWriter {
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxQueueSize: number;
  private readonly storage: AuditStorageAdapter;

  private queue: Array<{ payload: AuditRecordPayload; resolve: (rec: AuditRecord) => void; reject: (err: Error) => void }> = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private isRunning = false;

  private currentSequence = 0;
  private lastHash = AuditHasher.GENESIS_PREV_HASH;
  private currentBlockNumber = 0;
  private lastBlockHash = AuditHasher.GENESIS_PREV_HASH;

  constructor(options: AuditWriterOptions = {}) {
    this.batchSize = options.batchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 1000;
    this.maxQueueSize = options.maxQueueSize ?? 10000;
    this.storage = options.storageAdapter ?? new InMemoryAuditStorageAdapter();

    if (options.autoStart ?? true) {
      this.start();
    }
  }

  public async initialize(): Promise<void> {
    const latestRecord = await this.storage.getLatestRecord();
    if (latestRecord) {
      this.currentSequence = latestRecord.sequence;
      this.lastHash = latestRecord.hash;
    }
    const latestBlock = await this.storage.getLatestBlock();
    if (latestBlock) {
      this.currentBlockNumber = latestBlock.blockNumber;
      this.lastBlockHash = latestBlock.blockHash;
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleFlush();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  public async append(payload: AuditRecordPayload): Promise<AuditRecord> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`AuditWriter queue limit exceeded (${this.maxQueueSize}). Backpressure triggered.`);
    }

    const promise = new Promise<AuditRecord>((resolve, reject) => {
      this.queue.push({ payload, resolve, reject });
    });

    void this.flush();
    return promise;
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const itemsToProcess = this.queue.splice(0, this.batchSize);

    try {
      const records: AuditRecord[] = [];
      const now = new Date().toISOString();

      for (const item of itemsToProcess) {
        this.currentSequence += 1;
        const recordId = randomUUID();
        const prevHash = this.lastHash;
        const hash = AuditHasher.computeChainHash(prevHash, this.currentSequence, item.payload);
        this.lastHash = hash;

        const record: AuditRecord = {
          id: recordId,
          sequence: this.currentSequence,
          prevHash,
          hash,
          payload: item.payload,
          createdAt: now,
        };

        records.push(record);
      }

      // Build Merkle Block for the batch
      const merkleData = AuditHasher.buildMerkleTree(records.map((r) => r.hash));
      this.currentBlockNumber += 1;
      const blockHashPayload = {
        blockNumber: this.currentBlockNumber,
        startSequence: records[0].sequence,
        endSequence: records[records.length - 1].sequence,
        merkleRoot: merkleData.root,
        prevBlockHash: this.lastBlockHash,
      };
      const blockHash = AuditHasher.hashData(blockHashPayload);

      for (const record of records) {
        record.merkleRoot = merkleData.root;
        record.blockNumber = this.currentBlockNumber;
      }

      const block: AuditBlock = {
        blockNumber: this.currentBlockNumber,
        startSequence: records[0].sequence,
        endSequence: records[records.length - 1].sequence,
        recordCount: records.length,
        merkleRoot: merkleData.root,
        prevBlockHash: this.lastBlockHash,
        blockHash,
        createdAt: now,
      };

      this.lastBlockHash = blockHash;

      // Persist to storage
      await this.storage.appendRecords(records);
      await this.storage.appendBlock(block);

      // Resolve individual promises
      for (let i = 0; i < itemsToProcess.length; i++) {
        itemsToProcess[i].resolve(records[i]);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      for (const item of itemsToProcess) {
        item.reject(err);
      }
    } finally {
      this.isFlushing = false;
      if (this.queue.length > 0) {
        void this.flush();
      }
    }
  }

  private scheduleFlush(): void {
    if (!this.isRunning) return;
    this.flushTimer = setTimeout(() => {
      void this.flush().finally(() => {
        this.scheduleFlush();
      });
    }, this.flushIntervalMs);
    this.flushTimer?.unref?.();
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getCurrentSequence(): number {
    return this.currentSequence;
  }

  public getLastHash(): string {
    return this.lastHash;
  }
}
