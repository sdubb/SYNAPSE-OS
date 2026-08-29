import fs from "node:fs/promises";
import path from "node:path";
import {
  type EvidenceItem,
  type ArtifactRecord,
  type EvidenceKind,
} from "@synapse/contracts";
import { EvidenceHasher } from "./EvidenceHasher.js";

export interface CreateEvidenceInput {
  tenantId: string;
  verificationRunId?: string;
  taskId?: string;
  sessionId?: string;
  kind: EvidenceKind;
  label: string;
  content: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface StoreArtifactInput {
  tenantId: string;
  workspaceId?: string;
  sessionId?: string;
  taskId?: string;
  name: string;
  contentBuffer: Buffer;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export class EvidenceStore {
  private evidenceItems: Map<string, EvidenceItem> = new Map();
  private artifacts: Map<string, { record: ArtifactRecord; buffer: Buffer }> = new Map();
  private storageDirectory?: string;

  constructor(storageDirectory?: string) {
    this.storageDirectory = storageDirectory ? path.resolve(storageDirectory) : undefined;
  }

  /**
   * Persists an evidence record.
   */
  public async storeEvidence(input: CreateEvidenceInput): Promise<EvidenceItem> {
    const id = crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`;
    const contentSha256 = EvidenceHasher.hash(input.content);
    const byteSize = Buffer.byteLength(input.content, "utf8");

    const item: EvidenceItem = {
      id,
      tenantId: input.tenantId as `${string}-${string}-${string}-${string}-${string}`,
      verificationRunId: input.verificationRunId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      taskId: input.taskId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      sessionId: input.sessionId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      kind: input.kind,
      label: input.label,
      content: input.content,
      contentSha256,
      mimeType: input.mimeType ?? "text/plain",
      byteSize,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    this.evidenceItems.set(id, item);

    if (this.storageDirectory) {
      const tenantDir = path.join(this.storageDirectory, input.tenantId, "evidence");
      await fs.mkdir(tenantDir, { recursive: true });
      await fs.writeFile(
        path.join(tenantDir, `${id}.json`),
        JSON.stringify(item, null, 2),
        "utf8"
      );
    }

    return item;
  }

  /**
   * Retrieves an evidence record by ID.
   */
  public async getEvidence(id: string): Promise<EvidenceItem | null> {
    return this.evidenceItems.get(id) ?? null;
  }

  /**
   * Lists all evidence items for a verification run.
   */
  public async listEvidence(verificationRunId: string): Promise<EvidenceItem[]> {
    const list: EvidenceItem[] = [];
    for (const item of this.evidenceItems.values()) {
      if (item.verificationRunId === verificationRunId) {
        list.push({ ...item });
      }
    }
    return list;
  }

  /**
   * Stores a binary artifact with checksum and metadata.
   */
  public async storeArtifact(input: StoreArtifactInput): Promise<ArtifactRecord> {
    const id = crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`;
    const sha256 = EvidenceHasher.hash(input.contentBuffer);
    const sizeBytes = input.contentBuffer.length;
    const storagePath = `artifacts/${input.tenantId}/${id}/${input.name}`;

    const record: ArtifactRecord = {
      id,
      tenantId: input.tenantId as `${string}-${string}-${string}-${string}-${string}`,
      workspaceId: input.workspaceId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      sessionId: input.sessionId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      taskId: input.taskId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      name: input.name,
      storagePath,
      sha256,
      sizeBytes,
      mimeType: input.mimeType ?? "application/octet-stream",
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    this.artifacts.set(id, { record, buffer: input.contentBuffer });

    if (this.storageDirectory) {
      const artifactDir = path.join(this.storageDirectory, input.tenantId, "artifacts", id);
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(path.join(artifactDir, input.name), input.contentBuffer);
      await fs.writeFile(
        path.join(artifactDir, "metadata.json"),
        JSON.stringify(record, null, 2),
        "utf8"
      );
    }

    return record;
  }

  /**
   * Retrieves an artifact record by ID.
   */
  public async getArtifactRecord(id: string): Promise<ArtifactRecord | null> {
    const entry = this.artifacts.get(id);
    return entry ? entry.record : null;
  }

  /**
   * Retrieves an artifact binary Buffer by ID.
   */
  public async getArtifactBuffer(id: string): Promise<Buffer | null> {
    const entry = this.artifacts.get(id);
    return entry ? entry.buffer : null;
  }
}
