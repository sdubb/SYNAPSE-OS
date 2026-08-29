import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import {
  verificationPlans,
  verificationRuns,
  evidence,
  artifacts,
  verifications,
  type VerificationPlanRecord,
  type NewVerificationPlanRecord,
  type VerificationRunRecord,
  type NewVerificationRunRecord,
  type EvidenceRecord,
  type NewEvidenceRecord,
  type ArtifactRecordDb,
  type NewArtifactRecordDb,
  type VerificationRecord,
  type NewVerificationRecord,
} from "../schemas/verification.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class VerificationRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "VerificationRepository");
    }
    return tenantId;
  }

  // ---------------------------------------------------------------------------
  // Flat `verifications` table — used by REST backend (AppController)
  // ---------------------------------------------------------------------------

  async list(options?: {
    tenantId?: string;
    sessionId?: string;
    agentId?: string;
    verdict?: string;
    limit?: number;
    offset?: number;
  }): Promise<VerificationRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(verifications.tenantId, tid)];

    if (options?.sessionId) {
      conditions.push(eq(verifications.sessionId, options.sessionId));
    }
    if (options?.agentId) {
      conditions.push(eq(verifications.agentId, options.agentId));
    }
    if (options?.verdict) {
      conditions.push(eq(verifications.verdict, options.verdict));
    }

    return await this.db
      .select()
      .from(verifications)
      .where(and(...conditions))
      .orderBy(desc(verifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, tenantId?: string): Promise<VerificationRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(verifications)
      .where(and(eq(verifications.id, id), eq(verifications.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async findBySessionId(sessionId: string, tenantId?: string): Promise<VerificationRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(verifications)
      .where(and(eq(verifications.sessionId, sessionId), eq(verifications.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async create(
    data: Omit<NewVerificationRecord, "tenantId"> & { tenantId?: string }
  ): Promise<VerificationRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(verifications)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create verification record");
    return created;
  }

  async update(
    id: string,
    data: Partial<NewVerificationRecord>,
    tenantId?: string
  ): Promise<VerificationRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(verifications)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(verifications.id, id), eq(verifications.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Verification Plans — used by verification-engine package
  // ---------------------------------------------------------------------------

  async createPlan(
    data: Omit<NewVerificationPlanRecord, "tenantId"> & { tenantId?: string }
  ): Promise<VerificationPlanRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(verificationPlans)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create verification plan");
    return created;
  }

  async findPlanById(id: string, tenantId?: string): Promise<VerificationPlanRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(verificationPlans)
      .where(and(eq(verificationPlans.id, id), eq(verificationPlans.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Verification Runs — used by verification-engine package
  // ---------------------------------------------------------------------------

  async createRun(
    data: Omit<NewVerificationRunRecord, "tenantId"> & { tenantId?: string }
  ): Promise<VerificationRunRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(verificationRuns)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create verification run");
    return created;
  }

  async findRunById(id: string, tenantId?: string): Promise<VerificationRunRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(verificationRuns)
      .where(and(eq(verificationRuns.id, id), eq(verificationRuns.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async completeRun(
    id: string,
    data: {
      overallVerdict: string;
      assertionResults: unknown;
      summary?: string;
      evidenceChainRootHash?: string;
    },
    tenantId?: string
  ): Promise<VerificationRunRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(verificationRuns)
      .set({
        overallVerdict: data.overallVerdict,
        assertionResults: data.assertionResults,
        summary: data.summary,
        evidenceChainRootHash: data.evidenceChainRootHash,
        completedAt: new Date(),
      })
      .where(and(eq(verificationRuns.id, id), eq(verificationRuns.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Evidence — used by evidence package
  // ---------------------------------------------------------------------------

  async recordEvidence(
    data: Omit<NewEvidenceRecord, "tenantId"> & { tenantId?: string }
  ): Promise<EvidenceRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(evidence)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to record evidence");
    return created;
  }

  async listEvidenceForRun(runId: string, tenantId?: string): Promise<EvidenceRecord[]> {
    const tid = this.resolveTenantId(tenantId);
    return await this.db
      .select()
      .from(evidence)
      .where(and(eq(evidence.verificationRunId, runId), eq(evidence.tenantId, tid)))
      .orderBy(desc(evidence.createdAt));
  }

  // ---------------------------------------------------------------------------
  // Artifacts — used by evidence/storage packages
  // ---------------------------------------------------------------------------

  async recordArtifact(
    data: Omit<NewArtifactRecordDb, "tenantId"> & { tenantId?: string }
  ): Promise<ArtifactRecordDb> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(artifacts)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to record artifact");
    return created;
  }

  async findArtifactById(id: string, tenantId?: string): Promise<ArtifactRecordDb | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, id), eq(artifacts.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }
}
