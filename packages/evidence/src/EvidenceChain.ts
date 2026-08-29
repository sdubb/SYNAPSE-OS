import {
  type EvidenceItem,
  type EvidenceChainBlock,
  type EvidenceChainRecord,
} from "@synapse/contracts";
import { EvidenceHasher } from "./EvidenceHasher.js";

export class EvidenceChainBuilder {
  private tenantId: string;
  private verificationRunId: string;
  private blocks: EvidenceChainBlock[] = [];
  private lastBlockHash = "0000000000000000000000000000000000000000000000000000000000000000";

  constructor(tenantId: string, verificationRunId: string) {
    this.tenantId = tenantId;
    this.verificationRunId = verificationRunId;
  }

  /**
   * Appends an evidence item to the chain and computes its cryptographic block hash.
   */
  public addEvidence(evidence: EvidenceItem): EvidenceChainBlock {
    const index = this.blocks.length;
    const timestamp = Date.now();
    const previousBlockHash = this.lastBlockHash;

    const blockPayload = {
      index,
      timestamp,
      evidenceId: evidence.id,
      evidenceSha256: evidence.contentSha256,
      previousBlockHash,
    };

    const blockHash = EvidenceHasher.hash(blockPayload);

    const block: EvidenceChainBlock = {
      index,
      timestamp,
      evidenceId: evidence.id,
      evidenceSha256: evidence.contentSha256,
      previousBlockHash,
      blockHash,
    };

    this.blocks.push(block);
    this.lastBlockHash = blockHash;
    return block;
  }

  /**
   * Seals the evidence chain and produces a verifiable EvidenceChainRecord.
   */
  public seal(): EvidenceChainRecord {
    const blockHashes = this.blocks.map((b) => b.blockHash);
    const rootHash = EvidenceHasher.computeMerkleRoot(blockHashes);

    return {
      id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
      tenantId: this.tenantId as `${string}-${string}-${string}-${string}-${string}`,
      verificationRunId: this.verificationRunId as `${string}-${string}-${string}-${string}-${string}`,
      rootHash,
      blocks: [...this.blocks],
      sealedAt: new Date().toISOString(),
      verified: true,
    };
  }

  public getBlocks(): EvidenceChainBlock[] {
    return [...this.blocks];
  }
}
