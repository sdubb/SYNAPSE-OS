import { z } from "zod";
export declare const EvidenceKindSchema: z.ZodEnum<["COMMAND_OUTPUT", "FILE_SNAPSHOT", "GIT_DIFF", "TEST_REPORT", "BUILD_LOG", "HTTP_RESPONSE", "SECURITY_SCAN_OUTPUT", "SCREENSHOT", "VERIFIER_TRANSCRIPT"]>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export declare const EvidenceItemSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    verificationRunId: z.ZodOptional<z.ZodString>;
    taskId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    kind: z.ZodEnum<["COMMAND_OUTPUT", "FILE_SNAPSHOT", "GIT_DIFF", "TEST_REPORT", "BUILD_LOG", "HTTP_RESPONSE", "SECURITY_SCAN_OUTPUT", "SCREENSHOT", "VERIFIER_TRANSCRIPT"]>;
    label: z.ZodString;
    content: z.ZodString;
    contentSha256: z.ZodString;
    mimeType: z.ZodDefault<z.ZodString>;
    byteSize: z.ZodNumber;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    kind: "COMMAND_OUTPUT" | "FILE_SNAPSHOT" | "GIT_DIFF" | "TEST_REPORT" | "BUILD_LOG" | "HTTP_RESPONSE" | "SECURITY_SCAN_OUTPUT" | "SCREENSHOT" | "VERIFIER_TRANSCRIPT";
    label: string;
    content: string;
    contentSha256: string;
    mimeType: string;
    byteSize: number;
    taskId?: string | undefined;
    sessionId?: string | undefined;
    verificationRunId?: string | undefined;
}, {
    id: string;
    tenantId: string;
    kind: "COMMAND_OUTPUT" | "FILE_SNAPSHOT" | "GIT_DIFF" | "TEST_REPORT" | "BUILD_LOG" | "HTTP_RESPONSE" | "SECURITY_SCAN_OUTPUT" | "SCREENSHOT" | "VERIFIER_TRANSCRIPT";
    label: string;
    content: string;
    contentSha256: string;
    byteSize: number;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: string | undefined;
    taskId?: string | undefined;
    sessionId?: string | undefined;
    verificationRunId?: string | undefined;
    mimeType?: string | undefined;
}>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export declare const EvidenceChainBlockSchema: z.ZodObject<{
    index: z.ZodNumber;
    timestamp: z.ZodNumber;
    evidenceId: z.ZodString;
    evidenceSha256: z.ZodString;
    previousBlockHash: z.ZodString;
    blockHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    evidenceId: string;
    timestamp: number;
    index: number;
    evidenceSha256: string;
    previousBlockHash: string;
    blockHash: string;
}, {
    evidenceId: string;
    timestamp: number;
    index: number;
    evidenceSha256: string;
    previousBlockHash: string;
    blockHash: string;
}>;
export type EvidenceChainBlock = z.infer<typeof EvidenceChainBlockSchema>;
export declare const EvidenceChainRecordSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    verificationRunId: z.ZodString;
    rootHash: z.ZodString;
    blocks: z.ZodDefault<z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        timestamp: z.ZodNumber;
        evidenceId: z.ZodString;
        evidenceSha256: z.ZodString;
        previousBlockHash: z.ZodString;
        blockHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        evidenceId: string;
        timestamp: number;
        index: number;
        evidenceSha256: string;
        previousBlockHash: string;
        blockHash: string;
    }, {
        evidenceId: string;
        timestamp: number;
        index: number;
        evidenceSha256: string;
        previousBlockHash: string;
        blockHash: string;
    }>, "many">>;
    sealedAt: z.ZodDefault<z.ZodString>;
    verified: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    blocks: {
        evidenceId: string;
        timestamp: number;
        index: number;
        evidenceSha256: string;
        previousBlockHash: string;
        blockHash: string;
    }[];
    verificationRunId: string;
    rootHash: string;
    sealedAt: string;
    verified: boolean;
}, {
    id: string;
    tenantId: string;
    verificationRunId: string;
    rootHash: string;
    blocks?: {
        evidenceId: string;
        timestamp: number;
        index: number;
        evidenceSha256: string;
        previousBlockHash: string;
        blockHash: string;
    }[] | undefined;
    sealedAt?: string | undefined;
    verified?: boolean | undefined;
}>;
export type EvidenceChainRecord = z.infer<typeof EvidenceChainRecordSchema>;
export declare const ArtifactRecordSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    taskId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    storagePath: z.ZodString;
    sha256: z.ZodString;
    sizeBytes: z.ZodNumber;
    mimeType: z.ZodDefault<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    tenantId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    mimeType: string;
    storagePath: string;
    sha256: string;
    sizeBytes: number;
    taskId?: string | undefined;
    workspaceId?: string | undefined;
    sessionId?: string | undefined;
}, {
    name: string;
    id: string;
    tenantId: string;
    storagePath: string;
    sha256: string;
    sizeBytes: number;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: string | undefined;
    taskId?: string | undefined;
    workspaceId?: string | undefined;
    sessionId?: string | undefined;
    mimeType?: string | undefined;
}>;
export type ArtifactRecord = z.infer<typeof ArtifactRecordSchema>;
//# sourceMappingURL=evidence.d.ts.map