import { z } from "zod";

export const EvidenceKindSchema = z.enum([
  "COMMAND_OUTPUT",
  "FILE_SNAPSHOT",
  "GIT_DIFF",
  "TEST_REPORT",
  "BUILD_LOG",
  "HTTP_RESPONSE",
  "SECURITY_SCAN_OUTPUT",
  "SCREENSHOT",
  "VERIFIER_TRANSCRIPT",
]);
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;

export const EvidenceItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  verificationRunId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  kind: EvidenceKindSchema,
  label: z.string().min(1).max(256),
  content: z.string(), // Raw text / serialized payload
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 hex string
  mimeType: z.string().default("text/plain"),
  byteSize: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidenceChainBlockSchema = z.object({
  index: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  evidenceId: z.string().uuid(),
  evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  previousBlockHash: z.string().regex(/^[a-f0-9]{64}$/),
  blockHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type EvidenceChainBlock = z.infer<typeof EvidenceChainBlockSchema>;

export const EvidenceChainRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  verificationRunId: z.string().uuid(),
  rootHash: z.string().regex(/^[a-f0-9]{64}$/),
  blocks: z.array(EvidenceChainBlockSchema).default([]),
  sealedAt: z.string().datetime().default(() => new Date().toISOString()),
  verified: z.boolean().default(true),
});
export type EvidenceChainRecord = z.infer<typeof EvidenceChainRecordSchema>;

export const ArtifactRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  name: z.string().min(1).max(256),
  storagePath: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().default("application/octet-stream"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type ArtifactRecord = z.infer<typeof ArtifactRecordSchema>;
