import {
  type EvidenceChainRecord,
  type EvidenceChainBlock,
  type EvidenceItem,
} from "@synapse/contracts";
import { EvidenceHasher } from "./EvidenceHasher.js";

export interface ChainVerificationReport {
  isValid: boolean;
  totalBlocks: number;
  rootHashMatches: boolean;
  recomputedRootHash: string;
  violations: string[];
}

export class EvidenceVerifier {
  /**
   * Verifies the cryptographic integrity of an entire EvidenceChainRecord.
   * Checks:
   * 1. Block 0 starts with zero previous hash.
   * 2. Every block's previousBlockHash matches the preceding block's blockHash.
   * 3. Every block's blockHash matches recomputed hash of its contents.
   * 4. The sealed rootHash matches the Merkle root of all block hashes.
   */
  public static verifyChain(chain: EvidenceChainRecord): ChainVerificationReport {
    const violations: string[] = [];
    const blocks = chain.blocks;

    if (blocks.length === 0) {
      const emptyRoot = "0000000000000000000000000000000000000000000000000000000000000000";
      const matches = chain.rootHash === emptyRoot;
      return {
        isValid: matches,
        totalBlocks: 0,
        rootHashMatches: matches,
        recomputedRootHash: emptyRoot,
        violations: matches ? [] : ["Empty chain root hash mismatch"],
      };
    }

    let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]!;

      // 1. Check index sequence
      if (block.index !== i) {
        violations.push(`Block index mismatch at position ${i}: expected ${i}, found ${block.index}`);
      }

      // 2. Check previous block hash linkage
      if (block.previousBlockHash !== expectedPrevHash) {
        violations.push(`Block ${i} broken hash chain: expected previousBlockHash '${expectedPrevHash}', found '${block.previousBlockHash}'`);
      }

      // 3. Recompute block hash
      const recomputedHash = EvidenceHasher.hash({
        index: block.index,
        timestamp: block.timestamp,
        evidenceId: block.evidenceId,
        evidenceSha256: block.evidenceSha256,
        previousBlockHash: block.previousBlockHash,
      });

      if (block.blockHash !== recomputedHash) {
        violations.push(`Block ${i} tamper detected: stored hash '${block.blockHash}' does not match recomputed hash '${recomputedHash}'`);
      }

      expectedPrevHash = block.blockHash;
    }

    // 4. Recompute Merkle root
    const blockHashes = blocks.map((b: EvidenceChainBlock) => b.blockHash);
    const recomputedRoot = EvidenceHasher.computeMerkleRoot(blockHashes);
    const rootHashMatches = chain.rootHash === recomputedRoot;

    if (!rootHashMatches) {
      violations.push(`Chain root hash mismatch: sealed root '${chain.rootHash}' != recomputed root '${recomputedRoot}'`);
    }

    return {
      isValid: violations.length === 0,
      totalBlocks: blocks.length,
      rootHashMatches,
      recomputedRootHash: recomputedRoot,
      violations,
    };
  }

  /**
   * Verifies that an individual evidence item's payload matches its recorded SHA-256 hash.
   */
  public static verifyEvidenceItem(item: EvidenceItem): boolean {
    const recomputed = EvidenceHasher.hash(item.content);
    return item.contentSha256 === recomputed;
  }
}
