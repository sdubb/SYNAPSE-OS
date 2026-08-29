import { createHash } from 'node:crypto';

export interface MerkleProof {
  leaf: string;
  position: 'left' | 'right';
  hash: string;
}

export interface MerkleVerificationResult {
  valid: boolean;
  computedRoot: string;
  expectedRoot: string;
}

export class AuditHasher {
  public static readonly GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Generates a deterministic SHA-256 hash for any arbitrary JSON-serializable payload.
   */
  public static hashData(data: unknown): string {
    const serialized = typeof data === 'string' ? data : this.canonicalSerialize(data);
    return createHash('sha256').update(serialized, 'utf8').digest('hex');
  }

  /**
   * Computes the sequential chain hash linking an event to its predecessor.
   * H_n = SHA-256(prevHash + ":" + sequence + ":" + canonicalPayload)
   */
  public static computeChainHash(prevHash: string, sequence: number, payload: unknown): string {
    const canonicalPayload = this.canonicalSerialize(payload);
    const combined = `${prevHash}:${sequence}:${canonicalPayload}`;
    return createHash('sha256').update(combined, 'utf8').digest('hex');
  }

  /**
   * Deterministic JSON stringification sorting object keys alphabetically,
   * dropping undefined fields and normalizing non-finite numbers.
   */
  public static canonicalSerialize(obj: unknown): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }
    if (typeof obj === 'number') {
      return Number.isFinite(obj) ? String(obj) : 'null';
    }
    if (typeof obj === 'boolean') {
      return obj ? 'true' : 'false';
    }
    if (typeof obj === 'string') {
      return JSON.stringify(obj);
    }
    if (typeof obj === 'bigint') {
      return JSON.stringify(obj.toString());
    }
    if (obj instanceof Date) {
      return JSON.stringify(obj.toISOString());
    }
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => (item === undefined ? 'null' : this.canonicalSerialize(item))).join(',')}]`;
    }
    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined && typeof record[key] !== 'function' && typeof record[key] !== 'symbol')
        .sort();

      const keyValues = keys.map(
        (key) => `${JSON.stringify(key)}:${this.canonicalSerialize(record[key])}`
      );
      return `{${keyValues.join(',')}}`;
    }
    return JSON.stringify(obj);
  }

  /**
   * Builds a Merkle Tree from an array of leaf hashes or arbitrary event data with RFC 6962 domain separation.
   * Returns the Merkle Root hash and the intermediate layers.
   */
  public static buildMerkleTree(items: (string | unknown)[]): {
    root: string;
    layers: string[][];
  } {
    if (items.length === 0) {
      const emptyRoot = '0000000000000000000000000000000000000000000000000000000000000000';
      return { root: emptyRoot, layers: [[emptyRoot]] };
    }

    const leaves: string[] = items.map((item) =>
      typeof item === 'string' && /^[0-9a-fA-F]{64}$/.test(item)
        ? item.toLowerCase()
        : this.hashData(item)
    );

    const layers: string[][] = [leaves];
    let currentLayer = leaves;

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i]!;
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1]! : left;

        const leftBuf = Buffer.from(left, 'hex');
        const rightBuf = Buffer.from(right, 'hex');
        const prefix = Buffer.from([0x01]); // RFC 6962 interior node prefix

        const combined = createHash('sha256')
          .update(Buffer.concat([prefix, leftBuf, rightBuf]))
          .digest('hex');
        nextLayer.push(combined);
      }
      layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    return {
      root: currentLayer[0]!,
      layers,
    };
  }

  /**
   * Generates a Merkle inclusion proof for a leaf at a given index.
   */
  public static getMerkleProof(layers: string[][], leafIndex: number): MerkleProof[] {
    const proof: MerkleProof[] = [];
    if (layers.length === 0 || leafIndex < 0 || leafIndex >= layers[0].length) {
      return proof;
    }

    let currentIndex = leafIndex;
    for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
      const layer = layers[layerIdx];
      const isEven = currentIndex % 2 === 0;
      const pairIndex = isEven ? currentIndex + 1 : currentIndex - 1;

      if (pairIndex < layer.length) {
        proof.push({
          leaf: layer[currentIndex],
          position: isEven ? 'right' : 'left',
          hash: layer[pairIndex],
        });
      } else {
        proof.push({
          leaf: layer[currentIndex],
          position: 'right',
          hash: layer[currentIndex],
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verifies a Merkle inclusion proof against an expected root with RFC 6962 interior domain separation.
   */
  public static verifyMerkleProof(
    leafHash: string,
    proof: MerkleProof[],
    expectedRoot: string
  ): MerkleVerificationResult {
    let currentHash = leafHash.toLowerCase();

    for (const step of proof) {
      const stepHash = step.hash.toLowerCase();
      const leftHash = step.position === 'right' ? currentHash : stepHash;
      const rightHash = step.position === 'right' ? stepHash : currentHash;

      const leftBuf = Buffer.from(leftHash, 'hex');
      const rightBuf = Buffer.from(rightHash, 'hex');
      const prefix = Buffer.from([0x01]);

      currentHash = createHash('sha256')
        .update(Buffer.concat([prefix, leftBuf, rightBuf]))
        .digest('hex');
    }

    return {
      valid: currentHash === expectedRoot.toLowerCase(),
      computedRoot: currentHash,
      expectedRoot: expectedRoot.toLowerCase(),
    };
  }

  /**
   * Verifies sequential integrity for an array of audit records with chain hashes.
   */
  public static verifyChainIntegrity(
    records: Array<{
      sequence: number;
      prevHash: string;
      hash: string;
      payload: unknown;
    }>
  ): { valid: boolean; brokenAtSequence?: number; reason?: string } {
    if (records.length === 0) {
      return { valid: true };
    }

    // Sort by sequence to ensure proper order
    const sorted = [...records].sort((a, b) => a.sequence - b.sequence);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      if (i > 0) {
        const prev = sorted[i - 1];
        if (current.sequence !== prev.sequence + 1) {
          return {
            valid: false,
            brokenAtSequence: current.sequence,
            reason: `Sequence gap detected: expected ${prev.sequence + 1}, found ${current.sequence}`,
          };
        }
        if (current.prevHash !== prev.hash) {
          return {
            valid: false,
            brokenAtSequence: current.sequence,
            reason: `Previous hash mismatch at sequence ${current.sequence}: expected ${prev.hash}, found ${current.prevHash}`,
          };
        }
      }

      const expectedHash = this.computeChainHash(
        current.prevHash,
        current.sequence,
        current.payload
      );
      if (current.hash !== expectedHash) {
        return {
          valid: false,
          brokenAtSequence: current.sequence,
          reason: `Record content hash verification failed at sequence ${current.sequence}: expected ${expectedHash}, found ${current.hash}`,
        };
      }
    }

    return { valid: true };
  }
}
